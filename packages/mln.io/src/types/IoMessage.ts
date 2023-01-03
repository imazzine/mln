/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Type declaration.
 */

import { KafkaMessage, IHeaders } from "kafkajs";
import { IoMethod } from "../enums/IoMethod";
import { IoOrigin } from "../enums/IoOrigin";
import { IoSide } from "../enums/IoSide";

export type Connection = [
  service: string,
  name: string,
  side?: IoSide,
];

export type IoMessage = KafkaMessage & {
  headers: IHeaders & {
    method: IoMethod;
    origin: IoOrigin;
    uid: string;
    services?: string[];
    connection?: Connection;
  };
};
