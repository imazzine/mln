/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network worker message types definition.
 */

import { parse, stringify } from "uuid";
import { ByteBuffer, Builder } from "flatbuffers";
import {
  Message,
  Category,
  Type,
  Uid,
  Sync,
  Rate,
  Stream,
  Unstream,
  Content,
  Resource,
} from "./.fbs/index_generated";

export type Options =
  | Uint8Array
  | {
      category: Category;
      type: Type;
      source: string;
      target: string;
      scope:
        | { resources: string[] }
        | { worker: string; resource: string; rating: number }
        | { data: Uint8Array };
    };

export class WorkerMessage {
  private _buff: ByteBuffer;
  private _message: Message;
  private _builder: Builder;

  public get category(): Category {
    return this._message.category();
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

  // public get scope() {
  //   //
  // }

  constructor(options: Options) {
    this._builder = new Builder(1024);

    if (options instanceof Uint8Array) {
      this._buff = new ByteBuffer(options);
      this._message = Message.getRootAsMessage(this._buff);
    } else {
      const src = Uid.createUid(
        this._builder,
        <number[]>parse(options.source),
      );
      const trg = Uid.createUid(
        this._builder,
        <number[]>parse(options.target),
      );

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
            <{ data: Uint8Array }>options.scope,
          );
          break;
        default:
          throw TypeError("Unsupported message type.");
      }
      Message.startMessage(this._builder);
      Message.addCategory(this._builder, options.category);
      Message.addType(this._builder, options.type);
      Message.addSource(this._builder, src);
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
    Sync.startResourcesVector(
      this._builder,
      Object.keys(scope.resources).length,
    );
    Object.keys(scope.resources).forEach((resource) => {
      Resource.createResource(
        this._builder,
        <number[]>(
          (<unknown>Uint8Array.from(Buffer.from(resource, "utf8")))
        ),
      );
    });
    const resources = this._builder.endVector();
    Sync.startSync(this._builder);
    Sync.addResources(this._builder, resources);
    return Sync.endSync(this._builder);
  }

  private _getRateOffset(scope: {
    worker: string;
    resource: string;
    rating: number;
  }): number {
    const worker = Uid.createUid(
      this._builder,
      <number[]>parse(scope.worker),
    );
    const resource = Resource.createResource(
      this._builder,
      <number[]>(
        (<unknown>(
          Uint8Array.from(Buffer.from(scope.resource, "utf8"))
        ))
      ),
    );
    Rate.startRate(this._builder);
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

  private _getContentOffset(scope: { data: Uint8Array }): number {
    const data = Content.createDataVector(this._builder, scope.data);
    Content.startContent(this._builder);
    Content.addData(this._builder, data);
    return Content.endContent(this._builder);
  }
}
