/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Type declaration.
 */

import { IoStatus } from "../enums/IoStatus";
export type IoNodeMeta = {
  status: IoStatus;
  services: {
    [service: string]: {
      [conn: string]: [client: string, service: string];
    };
  };
  timeout: null | number | ReturnType<typeof setTimeout>;
};
