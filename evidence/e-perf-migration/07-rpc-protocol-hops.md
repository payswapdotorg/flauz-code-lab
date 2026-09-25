# Evidence 07 — RPC protocol: hop structure and per-chunk cost

Tree: payswapdotorg/Flauz @ 9bf9ae764da. Quotes verbatim (2-c bundle + spot-check).

## One logical call = 1 IPC leg over a DIRECT MessagePort (main only brokers the port once)

- Proxy mechanism — `src/vs/workbench/services/extensions/common/rpcProtocol.ts:249-262` (verified directly):
```ts
	private _createProxy<T>(rpcId: number, debugName: string): T {
		const handler = {
			get: (target: any, name: PropertyKey) => {
				if (typeof name === 'string' && !target[name] && name.charCodeAt(0) === CharCode.DollarSign) {
					target[name] = (...myArgs: any[]) => {
						return this._remoteCall(rpcId, name, myArgs);
					};
				}
```
- Send — `rpcProtocol.ts:490-495`:
```ts
this._pendingRPCReplies[callId] = new PendingRPCReply(result, disposable);
this._onWillSendRequest(req);
const msg = MessageIO.serializeRequest(req, rpcId, methodName, serializedRequestArguments, !!cancellationToken);
this._logger?.logOutgoing(msg.byteLength, req, RequestInitiator.LocalSide, `request: ${getStringIdentifierForProxy(rpcId)}.${methodName}(`, args);
this._protocol.send(msg);
```
- Receipt: ack immediately, reply on settle — `rpcProtocol.ts:377-392`:
```ts
// Acknowledge the request
const msg = MessageIO.serializeAcknowledged(req);
this._logger?.logOutgoing(msg.byteLength, req, RequestInitiator.OtherSide, `ack`);
this._protocol.send(msg);

promise.then((r) => {
	delete this._cancelInvokedHandlers[callId];
	const msg = MessageIO.serializeReplyOK(req, r, this._uriReplacer);
```
- Wire message types — `rpcProtocol.ts:940-953`: `MessageType { RequestJSONArgs=1, ..., Acknowledged=5, Cancel=6, ReplyOKEmpty=7, ReplyOKVSBuffer=8, ReplyOKJSON=9, ReplyOKJSONWithBuffers=10, ReplyErrError=11, ReplyErrEmpty=12 }`.

## Transport wiring (Electron, local ext host)

- `src/vs/workbench/services/extensions/electron-browser/localProcessExtensionHost.ts:412-444` — `_establishProtocol` acquires a MessagePort (`acquirePort(undefined, opts.responseChannel, opts.responseNonce)`), resolves `{ onMessage, send: message => port.postMessage(message.buffer) }`; port brokered once by main: `src/vs/base/parts/ipc/electron-browser/ipc.mp.ts:37-46, 54-57` ("Wait until the main side has returned the MessagePort").
- Ext host receives its end via nodejs IPC env handshake: `src/vs/workbench/services/extensions/common/extensionHostEnv.ts:44-48`:
```ts
/**
 * The extension host will receive via nodejs IPC the MessagePort to its renderer.
 */
export class MessagePortExtHostConnection {
	public static ENV_KEY = 'VSCODE_WILL_SEND_MESSAGE_PORT';
```

## Chat first-token path (hop inventory)

Chain with the four RPC crossings (2-c bundle):
1. `src/vs/workbench/contrib/chat/browser/widget/chatWidget.ts:3557` — `await this.chatService.sendRequest(this.viewModel.sessionResource, requestInputs.input, {...})`
2. `src/vs/workbench/contrib/chat/common/chatService/chatService.ts:2127` — `sendRequest(sessionResource: URI, message: string, options?: IChatSendRequestOptions)`
3. `ChatModel` — `src/vs/workbench/contrib/chat/common/model/chatModel.ts:2644`
4. **RPC 1 (renderer→EH)**: `src/vs/workbench/api/browser/mainThreadChatAgents2.ts:366-369` — `await this._proxy.$invokeAgent(handle, request, { history, chatSessionContext }, token);`
5. Ext host agent handler: `src/vs/workbench/api/common/extHostChatAgents2.ts:986` — `$invokeAgent(...)`
6. **RPC 2 (EH→renderer)**: `src/vs/workbench/api/common/extHostLanguageModels.ts:529` — `await this._proxy.$tryStartChatRequest(from, languageModelId, requestId, new SerializableObjectWithBuffers(internalMessages), options, cts.token);`
7. Provider loop — `src/vs/workbench/api/browser/mainThreadLanguageModels.ts:219-246`:
```ts
for await (const part of response.stream) {
	this._logService.trace('[CHAT] request PART', extension.value, requestId, part);
	await this._proxy.$acceptResponsePart(requestId, new SerializableObjectWithBuffers(part));
}
```
(**RPC 3, renderer→EH, ONE RPC PER streamed chunk**)
8. **RPC 4 (EH→renderer)**: `src/vs/workbench/api/common/extHostChatAgents2.ts:99-113` (verified directly) — chunk batching exists (sendQueue flushed once per microtask):
```ts
				// does the actual send to the main thread
				const newLen = sendQueue.push(handle !== undefined ? [chunk, handle] : chunk);
				if (newLen === 1) {
					queueMicrotask(() => {
						const toNotify = notify;
						notify = [];
						that._proxy.$handleProgressChunk(that._request.requestId, sendQueue).finally(() => {
							toNotify.forEach(f => f());
						});
						sendQueue.length = 0;
					});
				}
```

## Tool invocation crossing

`src/vs/workbench/api/browser/mainThreadLanguageModelTools.ts:96-99`:
```ts
		invoke: async (dto, countTokens, progress, token) => {
			this._runningToolCalls.set(dto.callId, { countTokens, progress });
			const resultSerialized = await this._proxy.$invokeTool(dto, token);
```
(ext-host counterpart: `src/vs/workbench/api/common/extHostLanguageModelTools.ts`.)

## Browser tool call path (browserView)

ext host → renderer (`$invokeTool`) → shared process ('playwright' channel: `browserToolHelpers.ts:162-171` `playwrightService.invokeFunction(sessionId, pageId, fn.toString(), args)` → `playwrightService.ts:158` `void group.sendCDPMessage(message);`) → main process browserView CDP (`browserViewDebugger.ts:92` `Target.attachToTarget`) → Chromium renderer. Raw CDP screenshot: `src/vs/platform/browserView/electron-main/browserView.ts:910-913`:
```ts
		const result = await this.debugger.sendCommand('Page.captureScreenshot', {
			format,
			...(format === 'jpeg' ? { quality } : {}),
			captureBeyondViewport: true,
```

## Claims supported (→ PERFORMANCE-PLAN §5)

1. One logical request+response renderer↔ext-host = **1 IPC leg, ≥3 wire messages** (request + unconditional ack + reply); cancellation adds one Cancel message.
2. First visible chat token via the extension-host path = **4 logical RPCs ≈ 12 wire messages** ($invokeAgent, $tryStartChatRequest, $acceptResponsePart, $handleProgressChunk), all on one direct MessagePort — no per-message main-process hop.
3. Each additional streamed chunk ≈ 1-2 RPCs (batched via `sendQueue` microtask flush in extHostChatAgents2.ts:99-113) — throughput cost is linear in chunks but coalesced under bursts.
4. Browser tools traverse 4 process boundaries (ext host → renderer → shared process → main/CDP → Chromium) → budget their overhead separately from in-workbench tools.
