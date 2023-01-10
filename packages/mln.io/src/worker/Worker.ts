/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Worker types definition.
 */

import * as kafka from "kafka-node";
import { Node } from "@imazzine/mln.ts";
import {
  _client,
  _producer,
  _consumer,
  _admin,
  _resources,
  _workers,
  _streams,
} from "../symbols";

type Admin = {
  listTopics: (
    cb: (err: unknown, res: { [key: string]: string }) => void,
  ) => void;
  createTopics: (
    topics: {
      topic: string;
      partitions: number;
      replicationFactor: number;
    }[],
    cb: (error: unknown, result: unknown[]) => void,
  ) => void;
  on: (msg: string, cb: (...args: unknown[]) => void) => void;
};

export class Worker extends Node {
  private [_admin]: Admin;
  private [_producer]: null | kafka.Producer = null;
  private [_consumer]: null | kafka.Consumer = null;
  private [_resources]: Map<string, string[]> = new Map();
  private [_workers]: Map<string, string[]> = new Map();
  private [_streams]: Map<string, kafka.Producer> = new Map();

  public constructor() {
    super();

    // client
    const _client_ = new kafka.KafkaClient({
      kafkaHost: "127.0.0.1:9092",
    });

    // admin
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this[_admin] = new kafka.Admin(_client_);
    this[_admin].on("ready", () => {
      this[_admin].createTopics(
        [
          {
            topic: this.uid,
            partitions: 1,
            replicationFactor: 1,
          },
        ],
        (error, result) => {
          if (!error && result.length === 0) {
            this.logger.trace(
              `Worker's inbound queue created: ${this.uid}.`,
            );

            // producer
            const _client__ = new kafka.KafkaClient({
              kafkaHost: "127.0.0.1:9092",
            });
            this[_producer] = new kafka.Producer(_client__, {
              // requireAcks: 1,
              // ackTimeoutMs: 100,
              // partitionerType: 0,
            });
            this[_producer].on("ready", () => {
              this.logger.trace(
                `Worker's producer ready: ${this.uid}`,
              );

              // consumer
              const _client___ = new kafka.KafkaClient({
                kafkaHost: "127.0.0.1:9092",
              });
              this[_consumer] = new kafka.Consumer(
                _client___,
                [
                  {
                    topic: this.uid,
                    // partition: 0,
                    // offset: 0,
                  },
                ],
                {
                  groupId: this.uid,
                  autoCommit: true,
                  // autoCommitIntervalMs: 100,
                  // fetchMaxWaitMs: 100,
                  // fetchMinBytes: 1,
                  // fetchMaxBytes: 1024 * 1024,
                  // fromOffset: true,
                  // encoding: "buffer", // | "utf8"
                  // keyEncoding: "buffer", // | "utf8"
                },
              );
              this[_consumer].on(
                "message",
                (message: kafka.Message) => {
                  this.dispatch("message", {
                    topic: message.topic,
                    value: message.value,
                  });
                },
              );
              this[_consumer].on("error", (error) => {
                this.logger.error(error);
              });
              this[_consumer].on("offsetOutOfRange", (error) => {
                this.logger.error(error);
              });
              this.dispatch("ready");
            });

            this[_producer].on("error", (error) => {
              this.logger.error(error);
            });
          }
        },
      );
    });
    this[_admin].on("error", (error) => {
      this.logger.error(error);
    });
  }

  public ping(): void {
    this[_admin].listTopics((err, res) => {
      this.dispatch("pong", Object.values(res));
    });
  }

  public send(worker: string, data: Uint8Array): void {
    this[_producer] &&
      this[_producer].send(
        [
          {
            topic: worker,
            // string[] | Array<KeyedMessage> | string | KeyedMessage
            messages: data,
            key: this.uid,
            // partition?: number;
            // attributes?: number;
          },
        ],
        (error: unknown, data: unknown) => {
          //
        },
      );
  }
}
