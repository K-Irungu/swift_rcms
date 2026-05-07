import { EventEmitter } from "events";

// Module-level emitter shared across requests in the same Node.js process.
// Suitable for single-process PM2 deployments (fork mode).
const inviteEmitter = new EventEmitter();
inviteEmitter.setMaxListeners(200);

export default inviteEmitter;
