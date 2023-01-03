/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network worker class definition.
 */

import {
  Kafka,
  logLevel as LogLevel,
  Consumer,
  Producer,
  EachMessagePayload,
} from "kafkajs";
import {
  getUid,
  Node,
  destruct,
  MonitorableCheckpoint,
} from "@imazzine/mln.ts";
import { IoMessage, Connection } from "./types/IoMessage";
import { IoMethod } from "./enums/IoMethod";
import { IoOrigin } from "./enums/IoOrigin";
import { IoStatus } from "./enums/IoStatus";
import { IoSide } from "./enums/IoSide";
import { IoNode } from "./IoNode";
import { _kafka, _consumer, _producer } from "./symbols";

export type IoWorkerOptions = {
  services: {
    [service: string]: {
      type: typeof IoNode;
      callback: (obj: IoNode) => void;
    };
  };
};

export class IoWorker extends Node {
  private [_kafka]: null | Kafka = null;
  private [_consumer]: null | Consumer = null;
  private [_producer]: null | Producer = null;

  private _status: null | IoStatus = null;
  private _interval: null | ReturnType<typeof setInterval> = null;
  private _counter = 0;
  private _services: {
    [service: string]: {
      type: typeof IoNode;
      callback: (obj: IoNode) => void;
      connections: {
        cli: {
          [conn: string]: {
            resolve: (obj: IoNode) => void;
            reject: (reason?: unknown) => void;
            timer: ReturnType<typeof setTimeout>;
            node?: IoNode;
          };
        };
        svc: {
          [conn: string]: {
            node?: IoNode;
          };
        };
      };
    };
  } = {};

  /**
   * @override
   */
  public constructor(opts: IoWorkerOptions) {
    super();

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `IoWorker.constructor()` call.",
      ),
    );

    this._services = this._services || {};
    opts.services &&
      Object.keys(opts.services).forEach((service: string) => {
        this._services[service] = {
          type: opts.services[service].type,
          callback: opts.services[service].callback,
          connections: {
            cli: {},
            svc: {},
          },
        };
      });

    const logger = this.logger;
    const kafka = new Kafka({
      clientId: "mln.io/worker",
      brokers: ["127.0.0.1:9092"],
      logLevel: LogLevel.INFO,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      logCreator: (logLevel) => {
        return (message) => {
          // TODO (buntarb): Check is this something additional?
          switch (message.level) {
            case LogLevel.ERROR:
              logger.error(
                `Kafka error: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case LogLevel.WARN:
              logger.warn(
                `Kafka warn: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case LogLevel.DEBUG:
              logger.debug(
                `Kafka debug: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case LogLevel.INFO:
              logger.info(
                `Kafka info: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case LogLevel.NOTHING:
              logger.trace(
                `Kafka trace: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
          }
        };
      },
    });

    const consumer = kafka.consumer({
      groupId: this.uid,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      allowAutoTopicCreation: false,
      retry: { retries: 10 },
      readUncommitted: false,
    });
    const producer = kafka.producer({
      retry: undefined,
      transactionTimeout: 60000,
      idempotent: false,
    });

    Promise.all([consumer.connect(), producer.connect()])
      .then(async () => {
        await this._onconnected(kafka, consumer, producer);
      })
      .catch((reason) => {
        this.logger.error(reason);
        this.destructor();
      });
  }

  /**
   * @override
   */
  protected [destruct](): void {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `WorkerNode[destruct]()` call.",
      ),
    );

    this[_kafka] = null;
    this[_consumer] = null;
    this[_producer] = null;

    super[destruct]();
  }

  private async _onconnected(
    kafka: Kafka,
    consumer: Consumer,
    producer: Producer,
  ): Promise<void> {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `WorkerNode._onconnected()` call.",
      ),
    );

    this[_kafka] = kafka;
    this[_consumer] = consumer;
    this[_producer] = producer;

    await this[_consumer].subscribe({
      topic: "mln.io",
      fromBeginning: false,
    });

    await this[_consumer].run({
      autoCommit: true,
      // eslint-disable-next-line @typescript-eslint/require-await
      eachMessage: async (msg: EachMessagePayload) => {
        this._processMessage(msg);
      },
    });

    await this[_producer]?.send({
      topic: "mln.io",
      acks: -1,
      messages: [
        {
          key: `${this.uid}`,
          value: null,
          headers: {
            uid: this.uid,
            origin: IoOrigin.WORKER,
            method: IoMethod.REGISTER,
            services: Object.keys(this._services),
          },
        },
      ],
      timeout: 5000,
    });

    this.dispatch("connected");
  }

  private _processMessage(msg: EachMessagePayload) {
    const { topic, message } = msg;
    if (message.headers?.uid?.toString() === this.uid) {
      switch (topic) {
        case "mln.io":
          try {
            this._handleIoMessage(<IoMessage>message);
          } catch (err) {
            this.logger.error(err);
          }
          break;
        default:
          this._handleServiceMessage(msg);
          break;
      }
    }
  }

  private _handleServiceMessage(msg: EachMessagePayload) {
    const { topic, message } = msg;
    const [service] = topic.split(".");
    const headers = (<IoMessage>message).headers;
    const side = <IoSide>(<Connection>headers.connection)[2];
    const cli = this._services[service].connections.cli[topic].node;
    const svc = this._services[service].connections.svc[topic].node;
    if (side === IoSide.CLIENT) {
      if (!cli) {
        // TODO (buntarb): cleanup here
        throw Error("Service cli connection node is missed.");
      } else {
        cli.dispatch("message", message);
      }
    } else {
      if (!svc) {
        // TODO (buntarb): cleanup here
        throw Error("Service svc connection node is missed.");
      } else {
        svc.dispatch("message", message);
      }
    }
    this.dispatch(topic, message);
  }

  private _handleIoMessage(message: IoMessage): void {
    if (message.headers.uid.toString() === this.uid) {
      switch (message.headers.method.toString()) {
        case IoMethod.REGISTER:
          this._register(message);
          break;
        case IoMethod.REGISTERED:
          this._registered(message);
          break;
        case IoMethod.UNREGISTER:
          this._unregister(message);
          break;
        case IoMethod.UNREGISTERING:
          this._unregistering(message);
          break;
        case IoMethod.UNREGISTERED:
          this._unregistered(message);
          break;
        case IoMethod.HEARTBEAT:
          this._heartbeat(message);
          break;
        case IoMethod.CONNECT:
          this._connect(message);
          break;
        case IoMethod.CONNECTED:
          this._connected(message);
          break;
        case IoMethod.DISCONNECT:
          this._disconnect(message);
          break;
        case IoMethod.DISCONNECTED:
          this._disconnected(message);
          break;
        default:
          throw new Error(
            `Unknown method: ${message.headers.method}`,
          );
      }
    }
  }

  private _register(message: IoMessage): void {
    // parsing message
    this.parseMessage("_register", message);

    // changing local state
    this._status = IoStatus.REGISTERING;
  }

  private _registered(message: IoMessage): void {
    // parsing message
    this.parseMessage("_registered", message);

    // changing local state
    this._status = IoStatus.ACTIVE;
    this._interval = setInterval(() => {
      // running distrib cycle
      this[_producer]?.send({
        topic: "mln.io",
        acks: -1,
        messages: [
          {
            key: this.uid,
            value: null,
            headers: {
              uid: this.uid,
              origin: IoOrigin.WORKER,
              method: IoMethod.HEARTBEAT,
            },
          },
        ],
        timeout: 2500,
      }).catch;
      // TODO (buntarb): catch
    }, 2500);
  }

  private _unregister(message: IoMessage): void {
    // parsing message
    this.parseMessage("_unregister", message);

    // changing local state
    this._interval && clearInterval(this._interval);
    this._interval = null;
  }

  private _unregistering(message: IoMessage): void {
    // parsing message
    this.parseMessage("_unregistering", message);

    // changing local state
    this._status = IoStatus.UNREGISTERING;
  }

  private _unregistered(message: IoMessage): void {
    // parsing message
    this.parseMessage("_unregistered", message);

    // changing local state
    this._status = null;
    this.destructor();
  }

  private _heartbeat(message: IoMessage): void {
    // parsing message
    // this.parseMessage("_heartbeat", message);
  }

  private _connect(message: IoMessage): void {
    // parsing message
    const { connection } = this.parseMessage("_connect", message);
    const service = connection[0];
    const hash = connection[1];
    const side = <IoSide>connection[2];
    const conn = service + "." + hash;

    // asserting
    if (!side || side === IoSide.CLIENT) {
      if (!this._services[service]) {
        throw new Error(`Service is not defined: ${service}.`);
      }
      if (
        !this._services[service].connections.cli ||
        !this._services[service].connections.cli[conn]
      ) {
        throw new Error(`Connection data is missed: ${conn}.`);
      }
      const c = this._services[service].connections.cli[conn];
      clearTimeout(c.timer);
      c.timer = setTimeout(() => {
        c.reject("Connection timeout.");
        delete this._services[service].connections.cli[conn];
      }, 5000);
    } else if (side === IoSide.SERVICE) {
      // TODO (buntarb): This branch could be removed(?).
      if (!this._services[service]) {
        throw new Error(`Service is not defined: ${service}.`);
      }
      this._services[service].connections.svc =
        this._services[service].connections.svc || {};
      if (this._services[service].connections.svc[conn]) {
        throw new Error(`Connection is already exist: ${conn}.`);
      }
      this._services[service].connections.svc[conn] = {};
    }
  }

  private _connected(message: IoMessage): void {
    // parsing message
    const { connection } = this.parseMessage("_connected", message);
    const service = connection[0];
    const hash = connection[1];
    const side = <IoSide>connection[2];
    const conn = service + "." + hash;

    if (side === IoSide.SERVICE) {
      this._services[service].connections.svc =
        this._services[service].connections.svc || {};
      this._services[service].connections.svc[conn] = {};
    }

    const connections = this._services[service].connections[side];
    if (!connections[conn]) {
      throw new Error(`Connection data is missed for: ${conn}.`);
    }

    const ioNode = new IoNode({
      sendFn: (msg: string) => {
        this[_producer]
          ?.send({
            topic: conn,
            acks: -1,
            messages: [
              {
                key: `${this.uid}`,
                value: msg,
                headers: {
                  uid: this.uid,
                  origin: IoOrigin.WORKER,
                  method: IoMethod.MESSAGE,
                  connection: [
                    service,
                    hash,
                    side === IoSide.CLIENT
                      ? IoSide.SERVICE
                      : IoSide.CLIENT,
                  ],
                },
              },
            ],
            timeout: 5000,
          })
          .catch((reason) => {
            // TODO (buntarb): clean up for safety?
            this.logger.error(reason);
            throw reason;
          });
      },
      closeFn: () => {
        this[_producer]
          ?.send({
            topic: "mln.io",
            acks: -1,
            messages: [
              {
                key: `${this.uid}`,
                value: null,
                headers: {
                  uid: this.uid,
                  origin: IoOrigin.WORKER,
                  method: IoMethod.DISCONNECT,
                  connection: [service, hash],
                },
              },
            ],
            timeout: 5000,
          })
          .catch(() => {
            // TODO (buntarb): cleanup
          });
      },
    });

    if (side === IoSide.CLIENT) {
      this._listenTopic(conn)
        .then(() => {
          const _conn: {
            resolve: (obj: IoNode) => void;
            reject: (reason?: unknown) => void;
            timer: ReturnType<typeof setTimeout>;
            node?: IoNode | undefined;
          } = <
            {
              resolve: (obj: IoNode) => void;
              reject: (reason?: unknown) => void;
              timer: ReturnType<typeof setTimeout>;
              node?: IoNode | undefined;
            }
          >connections[conn];

          _conn.node = ioNode;
          _conn.resolve(ioNode);
          clearTimeout(_conn.timer);
        })
        .catch(() => {
          // TODO (buntarb): cleanup
        });
    } else if (side === IoSide.SERVICE) {
      this._listenTopic(conn)
        .then(() => {
          connections[conn].node = ioNode;
          this._services[service].callback(ioNode);
        })
        .catch(() => {
          // TODO (buntarb): cleanup
        });
    }
  }

  private _disconnect(message: IoMessage): void {
    // parsing message
    const { connection } = this.parseMessage("_disconnect", message);
    const service = connection[0];
    const hash = connection[1];
    const conn = service + "." + hash;
    this[_consumer] && this[_consumer].pause([{ topic: conn }]);
  }

  private _disconnected(message: IoMessage): void {
    // parsing message
    this.parseMessage("_disconnected", message);
  }

  private async _listenTopic(conn: string): Promise<void> {
    if (this[_consumer]) {
      this.logger.trace(
        new MonitorableCheckpoint(this.uid, `Listening: ${conn}`),
      );
      await this[_consumer].stop();
      await this[_consumer].subscribe({
        topic: conn,
        fromBeginning: true,
      });
      await this[_consumer].run({
        autoCommit: true,
        // eslint-disable-next-line @typescript-eslint/require-await
        eachMessage: async (msg: EachMessagePayload) => {
          this._processMessage(msg);
        },
      });
    }
  }

  // private async _unlistenTopic(conn: string): Promise<void> {
  //   if (this[_consumer]) {
  //     this.logger.trace(
  //       new MonitorableCheckpoint(this.uid, `
  // Unlistening: ${conn}`),
  //     );
  //     this[_consumer].pause([{ topic: conn }]);
  //     // await this[_consumer].run({
  //     //   autoCommit: true,
  //     //   eachMessage: async (msg: EachMessagePayload) => {
  //     //     this._processMessage(msg);
  //     //   },
  //     // });
  //   }
  // }

  public parseMessage(
    caller: string,
    message: IoMessage,
  ): {
    method: string;
    origin: string;
    uid: string;
    services: string[];
    connection: Connection;
  } {
    // parsing message
    const method = message.headers.method?.toString();
    const origin = message.headers.origin?.toString();
    const uid = message.headers.uid?.toString();
    const services = (message.headers.services || []).map((s) =>
      s.toString(),
    );
    // TODO (buntarb): Add assertion here.
    const connection: Connection = <Connection>(
      (message.headers.connection || []).map((s) => s && s.toString())
    );
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        `The IoNode.${caller}(({\n` +
          `  method: "${method}",\n` +
          `  origin: "${origin}",\n` +
          `  uid: "${uid}",\n` +
          `  services: ${JSON.stringify(services)},\n` +
          `  connection: ${JSON.stringify(connection)},\n` +
          `}) call.`,
      ),
    );
    return {
      method,
      origin,
      uid,
      services,
      connection,
    };
  }

  public async connect(service: string): Promise<IoNode> {
    const hash: string = getUid();
    const conn = `${service}.${hash}`;
    this[_producer]
      ?.send({
        topic: "mln.io",
        acks: -1,
        messages: [
          {
            key: `${this.uid}`,
            value: null,
            headers: {
              uid: this.uid,
              origin: IoOrigin.WORKER,
              method: IoMethod.CONNECT,
              connection: [service, hash],
            },
          },
        ],
        timeout: 5000,
      })
      .catch((reason) => {
        this.logger.error(reason);
      });
    return new Promise((resolve: (obj: IoNode) => void, reject) => {
      this._services[service] = this._services[service] || {};
      this._services[service].connections = {
        cli: {
          [conn]: {
            resolve,
            reject,
            timer: setTimeout(() => {
              this._services[service].connections.cli[conn].reject(
                "Connection timeout.",
              );
              delete this._services[service].connections.cli[conn];
            }, 5000),
          },
        },
        svc: {},
      };
    });
  }

  public async disconnect(): Promise<void> {
    const p: Promise<void>[] = [];
    if (this[_consumer]) {
      p.push(this[_consumer].disconnect());
    }
    if (this[_producer]) {
      p.push(this[_producer].disconnect());
    }
    await Promise.all(p);
    this.destructor();
  }
}
