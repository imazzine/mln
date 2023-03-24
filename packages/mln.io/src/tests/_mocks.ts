/**
 * @fileoverview Tests mocks declaration.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { LogsBuffer, syncBufferInternal } from "@imazzine/mln.ts";

/**
 * Test bearer.
 */
export const bearer =
  "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.blOll9vFK9Pg" +
  "YGoeobYIFPPKXTj1Ch8_qt4Tf1ScDUCLC4CU3dK38LidkBP7dWkrAZxiHMh461ED" +
  "5UGWRTTGnDSRzw85QAhNsqEClMOrs1GB4aYFOg76WivFQ4l6bPQGZQ3hTT-TwTnf" +
  "yG3mZFsc4Alb0YXNjDO9kue5kUtbFJx6HDdfraVEHeLjahw_DOFwGxqve_pNgTzb" +
  "RwWW7p4591QtLXJg04nYnlHybruJALnQTUYj7CycDL3PlnOrzHlybNQXhTuCNMxq" +
  "RzvRvjzOTU371E0N7qBA2uG8KR3caI5jy5aRphE-Tq9KhAueWQNLb11oD-gnbmyU" +
  "5Z9MN6d1-Sc30AEJ1OX5JvBG1zdGVSvwiTIf9ic4RDrIFuoYM_6Ad1K4R6ct2UTn" +
  "qEKSOXqOwfSYO25Z-tMJEN_7-mXbX9xrDx8V8y9YhXtFntzV_T9MVLNHqsMxjie-" +
  "Z_ekdV5lHMSUq4jyuJUo1ET54hMUGvVQ2o9H5g1gmgeE20A3CLW7.sMgQzoXYBEE" +
  "8l9Fv.H0Eln1LsmsK8m2cJudFgIpuhMTAYe-fP6Jb7IuxswxBp-f0JD4iu4DXeeD" +
  "W4oi7LF1eOhn3eSBpiBSvqeRhZmQd_zlTzXbHtpiymPnhzyI60JawcEijiKYLl8w" +
  ".CjUmHxzw5yv7srzPqODdPA";

/**
 * Logs buffer for tests.
 */
export class TestBuffer extends LogsBuffer {
  protected async [syncBufferInternal](): Promise<void> {
    return Promise.resolve();
  }
}
