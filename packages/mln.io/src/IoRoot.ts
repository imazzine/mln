/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network root node class definition.
 */

import {
  Kafka,
  logLevel as LogLevel,
  Consumer,
  Producer,
  Admin,
  ITopicMetadata,
  RecordMetadata,
} from "kafkajs";
import {
  Node,
  destruct,
  MonitorableCheckpoint,
} from "@imazzine/mln.ts";
import { IoMessage } from "./types/IoMessage";
import { IoNodeMeta } from "./types/IoNodeMeta";
import { IoNodesMap } from "./types/IoNodesMap";
import { IoMethod } from "./enums/IoMethod";
import { IoOrigin } from "./enums/IoOrigin";
import { IoStatus } from "./enums/IoStatus";
import { IoSide } from "./enums/IoSide";
import { _kafka, _consumer, _producer, _admin } from "./symbols";

export class IoRoot extends Node {
  private [_kafka]: null | Kafka = null;
  private [_consumer]: null | Consumer = null;
  private [_producer]: null | Producer = null;
  private [_admin]: null | Admin = null;

  private _io: null | {
    meta: ITopicMetadata;
    offset: number;
  } = null;

  private _workers: IoNodesMap = new Map();

  private _routers: IoNodesMap = new Map();

  private _services: Map<
    string,
    {
      [node: string]: {
        [conn: string]: [client: string, service: string];
      };
    }
  > = new Map();

  /**
   * @override
   */
  public constructor() {
    super();

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `IoRoot.constructor()` call.",
      ),
    );

    const logger = this.logger;
    const kafka = new Kafka({
      clientId: "mln.io/io",
      brokers: ["127.0.0.1:9092"],
      logLevel: LogLevel.WARN,
      logCreator: () => {
        return (message) => {
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
    const producer = kafka.producer();
    const admin = kafka.admin();

    Promise.all([
      consumer.connect(),
      producer.connect(),
      admin.connect(),
    ])
      .then(async () => {
        await this._onconnected(kafka, admin, consumer, producer);
      })
      .catch(async (reason) => {
        this.logger.error(reason);
        await this.disconnect();
      });
  }

  /**
   * @override
   */
  protected [destruct](): void {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `IoNode[destruct]()` call.",
      ),
    );

    this._io = null;
    this[_kafka] = null;
    this[_consumer] = null;
    this[_producer] = null;
    this[_admin] = null;

    super[destruct]();
  }

  private async _onconnected(
    kafka: Kafka,
    admin: Admin,
    consumer: Consumer,
    producer: Producer,
  ): Promise<void> {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `IoNode._onconnected()` call.",
      ),
    );

    this[_kafka] = kafka;
    this[_admin] = admin;
    this[_consumer] = consumer;
    this[_producer] = producer;
    await this._assertIo();
    await this._runIo();
  }

  private async _assertIo(): Promise<void> {
    if (!this[_admin]) {
      const err = new Error("Kafka Admin instance is missed.");
      this.logger.error(err);
      throw err;
    } else if (!this[_consumer]) {
      const err = new Error("Kafka Consumer instance is missed.");
      this.logger.error(err);
      throw err;
    } else if (!this[_producer]) {
      const err = new Error("Kafka Producer instance is missed.");
      this.logger.error(err);
      throw err;
    } else {
      const [created, metadata, offsets] = await Promise.all([
        this[_admin].createTopics({
          validateOnly: false,
          waitForLeaders: true,
          timeout: 5000,
          topics: [
            {
              topic: "mln.io",
              numPartitions: 1,
              replicationFactor: 1,
              replicaAssignment: [],
              configEntries: [],
            },
          ],
        }),
        this[_admin].fetchTopicMetadata({
          topics: ["mln.io"],
        }),
        this[_admin].fetchTopicOffsets("mln.io"),
      ]);

      if (!created && metadata.topics.length === 0) {
        const err = new Error(`mln.io topic was not created.`);
        this.logger.error(err);
        throw err;
      }

      // TODO (buntarb): This is multi processing limitation for now.
      this._io = {
        meta: metadata.topics[0],
        offset: Math.max(...offsets.map((o) => parseInt(o.offset))),
      };

      await this[_consumer].subscribe({
        topic: "mln.io",
        fromBeginning: true,
      });

      this.logger.trace(
        new MonitorableCheckpoint(
          this.uid,
          `mln.io topic asserted: ${JSON.stringify(
            {
              created,
              io: this._io,
            },
            undefined,
            2,
          )}`,
        ),
      );
    }
  }

  private async _runIo(): Promise<void> {
    if (!this[_consumer]) {
      const err = new Error("Kafka Consumer instance is missed.");
      this.logger.error(err);
      throw err;
    } else {
      this.logger.trace(
        new MonitorableCheckpoint(this.uid, "Running consumer."),
      );
      await this[_consumer].run({
        autoCommit: true,
        eachMessage: async ({ topic, message }) => {
          switch (topic) {
            case "mln.io":
              try {
                await this._handleIoMessage(<IoMessage>message);
              } catch (err) {
                this.logger.error(err);
              }
              break;
            default:
              this.logger.trace(
                new MonitorableCheckpoint(
                  this.uid,
                  `${topic}: ${JSON.stringify(message)}`,
                ),
              );
              break;
          }
        },
      });
    }
  }

  private async _handleIoMessage(message: IoMessage): Promise<void> {
    const origin = message.headers.origin.toString();
    if (origin === IoOrigin.WORKER) {
      await this._handleIoMethod(message);
    } else if (origin === IoOrigin.ROUTER) {
      // await this._handleIoMethod(message);
    } else if (origin === IoOrigin.CLIENT) {
      //
    } else if (origin === IoOrigin.ADMIN) {
      //
    } else {
      throw new Error(`Unknown origin: ${origin}`);
    }
  }

  private async _handleIoMethod(message: IoMessage): Promise<void> {
    switch (message.headers.method.toString()) {
      case IoMethod.REGISTER:
        await this._register(message);
        break;
      case IoMethod.REGISTERED:
        this._registered(message);
        break;
      case IoMethod.UNREGISTER:
        await this._unregister(message);
        break;
      case IoMethod.UNREGISTERING:
        await this._unregistering(message);
        break;
      case IoMethod.UNREGISTERED:
        this._unregistered(message);
        break;
      case IoMethod.HEARTBEAT:
        this._heartbeat(message);
        break;
      case IoMethod.CONNECT:
        await this._connect(message);
        break;
      case IoMethod.CONNECTED:
        this._connected(message);
        break;
      case IoMethod.DISCONNECT:
        await this._disconnect(message);
        break;
      case IoMethod.DISCONNECTED:
        this._disconnected(message);
        break;
      default:
        throw new Error(`Unknown method: ${message.headers.method}`);
    }
  }

  private async _register(message: IoMessage): Promise<void> {
    // parsing message
    const { origin, uid, services } = this.parseMessage(
      "_register",
      message,
    );

    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (map.has(uid)) {
      throw new Error(`The ${origin}/${uid} is already exists.`);
    } else {
      // changing local state
      this._addNode(message);

      // running distrib cycle
      if (!this.isRestoring(message)) {
        await this[_producer]?.send({
          topic: "mln.io",
          acks: -1,
          messages: [
            {
              key: message.key,
              value: null,
              headers: {
                uid,
                origin,
                method: IoMethod.REGISTERED,
                services,
              },
            },
          ],
          timeout: 5000,
        });
      }
    }
  }

  private _registered(message: IoMessage): void {
    // parsing message
    const { origin, uid } = this.parseMessage("_registered", message);

    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (!map.has(uid)) {
      throw new Error(`The ${origin}/${uid} does not exists.`);
    } else {
      const node = map.get(uid);
      if (node?.status !== IoStatus.REGISTERING) {
        throw new Error(`Invalid ${origin}/${uid} status.`);
      }
      // changing local state
      node.status = IoStatus.ACTIVE;
      node.timeout = setTimeout(
        this._heartbeatTimeoutCallback.bind(this, message),
        5000,
      );
    }
  }

  private async _unregister(message: IoMessage): Promise<void> {
    // parsing message
    const { origin, uid } = this.parseMessage("_unregister", message);

    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (!map.has(uid)) {
      throw new Error(`The ${origin}/${uid} does not exists.`);
    } else {
      // changing local state
      const node = <IoNodeMeta>map.get(uid);
      node.status = IoStatus.UNREGISTERING;
      node.timeout && clearTimeout(node.timeout);
      node.timeout = setTimeout(
        this._removeNode.bind(this, message),
        5000,
      );

      // running distrib cycle
      if (!this.isRestoring(message)) {
        await this[_producer]?.send({
          topic: "mln.io",
          acks: -1,
          messages: [
            {
              key: uid,
              value: null,
              headers: {
                uid,
                origin,
                method: IoMethod.UNREGISTERING,
              },
            },
          ],
          timeout: 5000,
        });
      }
    }
  }

  private async _unregistering(message: IoMessage): Promise<void> {
    // parsing message
    const { origin, uid } = this.parseMessage(
      "_unregistering",
      message,
    );

    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (!map.has(uid)) {
      throw Error(`The ${origin}/${uid} does not exists.`);
    } else {
      // changing local state
      this._removeNode(message);

      // running distrib cycle
      if (!this.isRestoring(message)) {
        await this[_producer]?.send({
          topic: "mln.io",
          acks: -1,
          messages: [
            {
              key: `${origin}/${uid}`,
              value: null,
              headers: {
                uid,
                origin,
                method: IoMethod.UNREGISTERED,
              },
            },
          ],
          timeout: 5000,
        });
      }
    }
  }

  private _unregistered(message: IoMessage): void {
    // parsing message
    const { origin, uid } = this.parseMessage(
      "_unregistered",
      message,
    );
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (map.has(uid)) {
      // changing local state
      this._removeNode(message);
      throw new Error(`The ${origin}/${uid} was not deleted.`);
    }
  }

  private _heartbeat(message: IoMessage): void {
    // parsing message
    const { origin, uid } = this.parseMessage(false, message);

    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    // asserting
    if (!map.has(uid)) {
      throw new Error(`The ${origin}/${uid} does not exists.`);
    } else {
      const node = map.get(uid);
      if (node?.status !== IoStatus.ACTIVE) {
        throw new Error(`Invalid ${origin}/${uid} status.`);
      }
      // changing local state
      node.timeout && clearTimeout(node.timeout);
      node.timeout = setTimeout(
        this._heartbeatTimeoutCallback.bind(this, message),
        5000,
      );
    }
  }

  private async _connect(message: IoMessage): Promise<void> {
    // parsing message
    const { origin, uid, connection } = this.parseMessage(
      "_connect",
      message,
    );
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;
    const service = connection[0];
    const hash = connection[1];

    // asserting
    if (!map.has(uid)) {
      throw new Error(`The ${origin}/${uid} does not exists.`);
    } else if (!this[_admin]) {
      throw new Error("Kafka Admin instance is missed.");
    } else if (!this[_consumer]) {
      throw new Error("Kafka Consumer instance is missed.");
    } else if (!this[_producer]) {
      throw new Error("Kafka Producer instance is missed.");
    } else if (!service || !hash) {
      throw new Error("Wrong connection request.");
    } else {
      const nodes = this._services.get(service) || {};
      const uids = Object.keys(nodes);
      if (!uids.length) {
        throw new Error(
          `Service "${service}" is temporary unavialable.`,
        );
      } else {
        // changing local state
        await this._addConnection(message);
      }
    }
  }

  private _connected(message: IoMessage): void {
    // parsing message
    this.parseMessage("_connected", message);
  }

  private async _disconnect(message: IoMessage): Promise<void> {
    // parsing message
    const { origin, uid, connection } = this.parseMessage(
      "_disconnect",
      message,
    );
    const service = connection[0];
    const hash = connection[1];
    const conn = service + "." + hash;
    const nodes = this._services.get(service) || {};
    const [cli, svc] = (nodes[uid] && nodes[uid][conn]) || [
      false,
      false,
    ];
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    if (uid === cli) {
      // asserting
      if (!map.has(cli)) {
        throw new Error(`The ${origin}/${cli} does not exists.`);
      } else if (!map.has(svc)) {
        throw new Error(`The ${origin}/${svc} does not exists.`);
      } else if (!this[_admin]) {
        throw new Error("Kafka Admin instance is missed.");
      } else if (!this[_consumer]) {
        throw new Error("Kafka Consumer instance is missed.");
      } else if (!this[_producer]) {
        throw new Error("Kafka Producer instance is missed.");
      } else if (!service || !hash) {
        throw new Error("Wrong connection request.");
      } else {
        await this._removeConnection(message);
      }
    }
  }

  private _disconnected(message: IoMessage): void {
    // parsing message
    this.parseMessage("_disconnected", message);
  }

  private _heartbeatTimeoutCallback(message: IoMessage): void {
    // parsing message
    const { origin, uid } = this.parseMessage(
      "_heartbeatTimeoutCallback",
      message,
    );
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;
    const node = map.get(uid);

    // asserting
    if (!node) {
      this.logger.error(
        new Error(`Heartbeating node is missed: ${origin}/${uid}.`),
      );
    } else {
      if (this.isRestoring(message)) {
        // changing local state
        this._removeNode(message);
      } else {
        // running distrib cycle
        this[_producer]?.send({
          topic: "mln.io",
          acks: -1,
          messages: [
            {
              key: uid,
              value: null,
              headers: {
                uid,
                origin,
                method: IoMethod.UNREGISTER,
              },
            },
          ],
          timeout: 5000,
        }).catch;
        // TODO (buntarb): catch
      }
    }
  }

  private _addNode(message: IoMessage) {
    const { origin, uid, services } = this.parseMessage(
      "_addNode",
      message,
    );
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;

    if (map.has(uid)) {
      throw new Error(`The ${origin}/${uid} is already exists.`);
    } else {
      // changing local state
      map.set(uid, {
        status: IoStatus.REGISTERING,
        timeout: null,
        services: {},
      });
      services.forEach((service: string) => {
        const nodes = this._services.get(service) || {};
        if (!nodes[uid]) {
          nodes[uid] = {};
        }
        this._services.set(service, nodes);
      });
    }
  }

  private _removeNode(message: IoMessage) {
    // parsing message
    const { origin, uid } = this.parseMessage("_removeNode", message);
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;
    const node = map.get(uid);
    if (!node) {
      this.logger.error(
        new Error(`Removing node is missed: ${origin}/${uid}.`),
      );
    } else {
      Object.keys(node.services).forEach((service) => {
        Object.keys(node.services[service]).forEach((conn) => {
          const [cli, svc] = node.services[service][conn];
          const [, hash] = conn.split(".");

          // client
          const cliMsg = { ...message };
          cliMsg.headers.uid = cli;
          cliMsg.headers.method = IoMethod.DISCONNECT;
          cliMsg.headers.connection = [service, hash, IoSide.SERVICE];
          this._removeConnection(cliMsg).catch((reason) => {
            throw reason;
          });

          // service
          const svcMsg = { ...message };
          svcMsg.headers.uid = svc;
          svcMsg.headers.method = IoMethod.DISCONNECT;
          svcMsg.headers.connection = [service, hash, IoSide.CLIENT];
          this._removeConnection(svcMsg).catch((reason) => {
            throw reason;
          });
        });

        // remove from service index
        const nodes = this._services.get(service);
        if (nodes && nodes[uid]) {
          delete nodes[uid];
        }
      });
      clearTimeout(<number>node.timeout);
      map.delete(uid);
    }
  }

  private async _addConnection(
    message: IoMessage,
  ): Promise<null | false | void> {
    // parsing message
    const { uid, connection, origin } = this.parseMessage(
      "_addConnection",
      message,
    );
    const service = connection[0];
    const hash = connection[1];
    const conn = service + "." + hash;
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;
    const cliNode = map.get(uid);
    const nodes = this._services.get(service) || {};
    const uids = Object.keys(nodes);
    uids.sort(
      (id1: string, id2: string) =>
        Object.keys(nodes[id1]).length -
        Object.keys(nodes[id2]).length,
    );
    const cli = uid;
    const svc = uids[0];
    const svcNode = map.get(svc);

    // asserting
    if (!cliNode) {
      throw new Error(`The worker does not exists: ${uid}`);
    }
    if (!svcNode) {
      throw new Error(`The worker does not exists: ${uid}`);
    }

    // changing local state
    cliNode.services[service] = cliNode.services[service] || {};
    cliNode.services[service][conn] = [cli, svc];
    svcNode.services[service] = svcNode.services[service] || {};
    svcNode.services[service][conn] = [cli, svc];
    nodes[svc][conn] = [cli, svc];

    if (!this.isRestoring(message)) {
      // asserting
      if (!this._workers.has(svc)) {
        throw new Error(`The worker does not exists: ${svc}`);
      }

      // running distrib cycle
      try {
        const added =
          this[_admin] &&
          (await this[_admin].createTopics({
            validateOnly: false,
            waitForLeaders: true,
            timeout: 5000,
            topics: [
              {
                topic: conn,
                numPartitions: 1,
                replicationFactor: 1,
                replicaAssignment: [],
                configEntries: [],
              },
            ],
          }));
        if (!added) {
          throw new Error(
            `Failed to create the connection "${conn}".`,
          );
        }
        await Promise.all([
          this[_producer]?.send({
            topic: "mln.io",
            acks: -1,
            messages: [
              {
                key: message.key,
                value: null,
                headers: {
                  uid,
                  origin,
                  method: IoMethod.CONNECTED,
                  connection: [...connection, IoSide.CLIENT],
                },
              },
            ],
            timeout: 5000,
          }),
          this[_producer]?.send({
            topic: "mln.io",
            acks: -1,
            messages: [
              {
                key: message.key,
                value: null,
                headers: {
                  uid: svc,
                  origin,
                  method: IoMethod.CONNECTED,
                  connection: [...connection, IoSide.SERVICE],
                },
              },
            ],
            timeout: 5000,
          }),
        ]).catch(() => {
          //
        });
      } catch (e) {
        delete cliNode.services[service][conn];
        delete svcNode.services[service][conn];
        delete nodes[svc][conn];
        throw e;
      }
    }
  }

  private async _removeConnection(message: IoMessage) {
    // parsing message
    const { uid, origin, connection } = this.parseMessage(
      "_removeConnection",
      message,
    );
    const service = connection[0];
    const hash = connection[1];
    const conn = service + "." + hash;
    const map =
      origin === IoOrigin.WORKER ? this._workers : this._routers;
    const node = map.get(uid);
    const nodes = this._services.get(service) || {};

    let cli: null | string = null;
    let svc: null | string = null;

    // asserting
    if (!node) {
      this.logger.error(new Error(`Removing node is missed: ${uid}`));
    } else {
      // change local state
      Object.keys(node.services).forEach((service) => {
        Object.keys(node.services[service]).forEach((conn) => {
          [cli, svc] = node.services[service][conn];
          delete node.services[service][conn];
          delete nodes[svc][conn];
        });
      });
    }

    if (!this.isRestoring(message)) {
      // asserting
      if (!cli) {
        throw new Error(`Client is missed in the conn object.`);
      } else if (!svc) {
        throw new Error(`Service is missed in the conn object.`);
      } else if (svc && !map.has(svc)) {
        throw new Error(`Service does not exists.`);
      } else if (!this[_admin]) {
        throw new Error("Kafka Admin instance is missed.");
      } else if (!this[_consumer]) {
        throw new Error("Kafka Consumer instance is missed.");
      } else if (!this[_producer]) {
        throw new Error("Kafka Producer instance is missed.");
      } else if (!service || !hash) {
        throw new Error("Wrong connection request.");
      } else {
        // running distrib cycle
        await this[_admin].deleteTopics({
          topics: [conn],
          timeout: 5000,
        });
        const promise: Promise<RecordMetadata[]>[] = [];
        if (map.has(cli)) {
          promise.push(
            this[_producer]?.send({
              topic: "mln.io",
              acks: -1,
              messages: [
                {
                  key: message.key,
                  value: null,
                  headers: {
                    uid: cli,
                    origin,
                    method: IoMethod.DISCONNECTED,
                    connection,
                  },
                },
              ],
              timeout: 5000,
            }),
          );
        }
        if (map.has(svc)) {
          promise.push(
            this[_producer]?.send({
              topic: "mln.io",
              acks: -1,
              messages: [
                {
                  key: message.key,
                  value: null,
                  headers: {
                    uid: svc,
                    origin,
                    method: IoMethod.DISCONNECTED,
                    connection,
                  },
                },
              ],
              timeout: 5000,
            }),
          );
        }
        await Promise.all(promise);
      }
    }
  }

  public isRestoring(message: IoMessage): boolean {
    return (
      typeof this._io?.offset === "number" &&
      parseInt(message.offset) < this._io?.offset
    );
  }

  public parseMessage(
    caller: false | string,
    message: IoMessage,
  ): {
    method: IoMethod;
    origin: IoOrigin;
    uid: string;
    services: string[];
    connection: string[];
  } {
    // parsing message
    const method = <IoMethod>message.headers.method?.toString();
    const origin = <IoOrigin>message.headers.origin?.toString();
    const uid = message.headers.uid?.toString();
    const services = (message.headers.services || []).map((s) =>
      s.toString(),
    );
    const connection: string[] = <string[]>(
      (message.headers.connection || []).map((s) => s && s.toString())
    );
    const mode = this.isRestoring(message) ? "restoring" : "working";
    if (caller) {
      this.logger.trace(
        new MonitorableCheckpoint(
          this.uid,
          `The IoNode.${caller}(({\n` +
            `  method: "${method}",\n` +
            `  origin: "${origin}",\n` +
            `  uid: "${uid}",\n` +
            `  services: ${JSON.stringify(services)},\n` +
            `  connection: ${JSON.stringify(connection)},\n` +
            `}) call in the ${mode} mode.`,
        ),
      );
    }
    return {
      method,
      origin,
      uid,
      services,
      connection,
    };
  }

  public async removeTopic(topic: string): Promise<void> {
    if (!this[_admin]) {
      const err = new Error("Kafka Admin instance is missed.");
      this.logger.error(err);
      throw err;
    } else {
      await this[_admin].deleteTopics({
        topics: [topic],
        timeout: 5000,
      });
    }
  }

  public async disconnect(): Promise<void> {
    const p: Promise<void>[] = [];
    if (this[_consumer]) {
      p.push(this[_consumer].disconnect());
    }
    if (this[_producer]) {
      p.push(this[_producer].disconnect());
    }
    if (this[_admin]) {
      p.push(this[_admin].disconnect());
    }
    await Promise.all(p);
    this.destructor();
  }
}
