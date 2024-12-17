import EventEmitter from "eventemitter3";

class EventBus extends EventEmitter {}

const eventBus = new EventBus();

export default eventBus;
