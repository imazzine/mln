/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Worker types definition.
 */

import * as kafka from "kafkajs";
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

export class Worker extends Node {
  private [_client]: kafka.Kafka;

  private [_admin]: kafka.Admin;
  private [_producer]: null | kafka.Producer = null;
  private [_consumer]: null | kafka.Consumer = null;

  private [_resources]: Map<string, string[]> = new Map();
  private [_workers]: Map<string, string[]> = new Map();
  private [_streams]: Map<string, kafka.Producer> = new Map();

  public constructor() {
    super();

    // client
    const logger = this.logger;
    this[_client] = new kafka.Kafka({
      clientId: "mln.io/io",
      brokers: ["127.0.0.1:9092"],
      logLevel: kafka.logLevel.WARN,
      logCreator: () => {
        return (message) => {
          switch (message.level) {
            case kafka.logLevel.ERROR:
              logger.error(
                `Kafka error: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case kafka.logLevel.WARN:
              logger.warn(
                `Kafka warn: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case kafka.logLevel.DEBUG:
              logger.debug(
                `Kafka debug: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case kafka.logLevel.INFO:
              logger.info(
                `Kafka info: ${JSON.stringify(
                  message,
                  undefined,
                  2,
                )}`,
              );
              break;
            case kafka.logLevel.NOTHING:
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

    // admin
    this[_admin] = this[_client].admin();
    this[_admin].connect().then(() => {
      return this[_admin]
        .createTopics({
          waitForLeaders: true,
          timeout: 10 * 1000,
          topics: [
            {
              topic: this.uid,
              numPartitions: 1,
              replicationFactor: 1,
            },
          ],
        })
        .then((res: boolean) => {
          if (!res) {
            this.logger.error(
              `Worker's topic was not created: ${this.uid}`,
            );
          } else {
            this.logger.trace(
              `Worker's inbound queue created: ${this.uid}.`,
            );
            this[_consumer] = this[_client].consumer({
              groupId: this.uid,
              sessionTimeout: 30000,
              rebalanceTimeout: 60000,
              heartbeatInterval: 3000,
              allowAutoTopicCreation: false,
              retry: { retries: 10 },
              readUncommitted: false,
            });
            this[_producer] = this[_client].producer();
            Promise.all([
              this[_consumer].connect(),
              this[_producer].connect(),
            ]).then(() => {
              this[_consumer] &&
                this[_consumer]
                  .subscribe({
                    topic: this.uid,
                    fromBeginning: true,
                  })
                  .then(() => {
                    this[_consumer] &&
                      this[_consumer]
                        .run({
                          autoCommit: true,
                          // eslint-disable-next-line max-len
                          // eslint-disable-next-line @typescript-eslint/require-await
                          eachMessage: async ({ message }) => {
                            this.dispatch("message", message);
                          },
                        })
                        .then(() => {
                          this.dispatch("ready");
                        }).catch;
                  }).catch;
            }).catch;
          }
        }).catch;
    }).catch;
  }

  public ping(): void {
    this[_admin]
      .listGroups()
      .then((res: { groups: kafka.GroupOverview[] }) => {
        this.dispatch(
          "pong",
          JSON.stringify(
            res.groups.map((el) => el.groupId),
            undefined,
            2,
          ),
        );
      }).catch;
  }

  public send(worker: string, data: Uint8Array): void {
    this[_producer] &&
      this[_producer].send({
        topic: worker,
        messages: [
          {
            value: "test message",
          },
        ], //   Buffer | string | null
        // acks: number
        // timeout?: number
        // compression?: CompressionTypes
      });
  }
}
