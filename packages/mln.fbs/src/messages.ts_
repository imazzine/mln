/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network worker messages types definition.
 */

import { parse, stringify } from "uuid";
import { ByteBuffer, Builder } from "flatbuffers";
import {
  Message,
  Mode,
  Type,
  Uid,
  Sync,
  Rate,
  Stream,
  Unstream,
  Content,
} from "./.fbs/index_generated";

export type Options =
  | Uint8Array
  | {
      mode: Mode;
      type: Type;
      source: string;
      target: string;
      scope:
        | null
        | { resources: string[] }
        | { worker: string; resource: string; rating: number }
        | { resource: string; data: Uint8Array };
    };

export class WorkerMessage {
  private _buff: ByteBuffer;
  private _message: Message;
  private _builder: Builder;

  public get mode(): Mode {
    return this._message.mode();
  }

  public get type(): Type {
    return this._message.type();
  }

  public get source(): string {
    const val: number[] = [];
    for (let i = 0; i < Uid.sizeOf(); i++) {
      val.push(<number>this._message.source()?.uid(i));
    }
    return stringify(val);
  }

  public get target(): string {
    const val: number[] = [];
    for (let i = 0; i < Uid.sizeOf(); i++) {
      val.push(<number>this._message.target()?.uid(i));
    }
    return stringify(val);
  }

  public get scope():
    | null
    | { resources: string[] }
    | { worker: string; resource: string; rating: number }
    | { resource: string; data: Uint8Array } {
    if (this.type === Type.Sync) {
      const resources: string[] = [];
      const sync: Sync = <Sync>(
        (<unknown>this._message.scope(new Sync()))
      );
      for (let i = 0; i < sync.resourcesLength(); i++) {
        const res = sync.resources(i);
        resources.push(res);
      }
      return { resources: resources };
    } else if (this.type === Type.Rate) {
      const uid: number[] = [];
      const rate: Rate = <Rate>(
        (<unknown>this._message.scope(new Rate()))
      );
      for (let i = 0; i < Uid.sizeOf(); i++) {
        uid.push(<number>rate.worker()?.uid(i));
      }
      const worker = stringify(uid);
      const resource = <string>rate.resource();
      const rating = rate.rating();
      return { worker, resource, rating };
    } else if (this.type === Type.Content) {
      const content: Content = <Content>(
        (<unknown>this._message.scope(new Content()))
      );
      return {
        resource: <string>content.resource(),
        data: <Uint8Array>content.dataArray(),
      };
    }
    return null;
  }

  constructor(options: Options) {
    this._builder = new Builder(1024);

    if (options instanceof Uint8Array) {
      this._buff = new ByteBuffer(options);
      this._message = Message.getRootAsMessage(this._buff);
    } else {
      let offset;
      switch (options.type) {
        case Type.Sync:
          offset = this._getSyncOffset(
            <{ resources: string[] }>options.scope,
          );
          break;
        case Type.Rate:
          offset = this._getRateOffset(
            <
              {
                worker: string;
                resource: string;
                rating: number;
              }
            >options.scope,
          );
          break;
        case Type.Stream:
          offset = this._getStreamOffset();
          break;
        case Type.Unstream:
          offset = this._getUnstreamOffset();
          break;
        case Type.Content:
          offset = this._getContentOffset(
            <{ resource: string; data: Uint8Array }>options.scope,
          );
          break;
        default:
          throw TypeError("Unsupported message type.");
      }
      Message.startMessage(this._builder);
      Message.addMode(this._builder, options.mode);
      Message.addType(this._builder, options.type);
      const src = Uid.createUid(
        this._builder,
        <number[]>parse(options.source),
      );
      Message.addSource(this._builder, src);
      const trg = Uid.createUid(
        this._builder,
        <number[]>parse(options.target),
      );
      Message.addTarget(this._builder, trg);
      Message.addScope(this._builder, offset);
      Message.finishMessageBuffer(
        this._builder,
        Message.endMessage(this._builder),
      );
      this._buff = new ByteBuffer(this._builder.asUint8Array());
      this._message = Message.getRootAsMessage(this._buff);
    }
  }

  private _getSyncOffset(scope: { resources: string[] }): number {
    const res: number[] = [];
    scope.resources.forEach((resource) => {
      res.push(this._builder.createString(resource));
    });
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const vec: number = Sync.createResourcesVector(
      this._builder,
      res,
    );
    Sync.startSync(this._builder);
    Sync.addResources(this._builder, vec);
    return Sync.endSync(this._builder);
  }

  private _getRateOffset(scope: {
    worker: string;
    resource: string;
    rating: number;
  }): number {
    const resource = this._builder.createString(scope.resource);
    Rate.startRate(this._builder);
    const worker = Uid.createUid(
      this._builder,
      <number[]>parse(scope.worker),
    );
    Rate.addWorker(this._builder, worker);
    Rate.addResource(this._builder, resource);
    Rate.addRating(this._builder, scope.rating);
    return Rate.endRate(this._builder);
  }

  private _getStreamOffset(): number {
    Stream.startStream(this._builder);
    return Stream.endStream(this._builder);
  }

  private _getUnstreamOffset(): number {
    Unstream.startUnstream(this._builder);
    return Unstream.endUnstream(this._builder);
  }

  private _getContentOffset(scope: {
    resource: string;
    data: Uint8Array;
  }): number {
    const resource = this._builder.createString(scope.resource);
    const data = Content.createDataVector(this._builder, scope.data);
    Content.startContent(this._builder);
    Content.addResource(this._builder, resource);
    Content.addData(this._builder, data);
    return Content.endContent(this._builder);
  }

  public serialize(): Uint8Array {
    return this._builder.asUint8Array();
  }
}
