/**
 * @fileoverview Declaration of the Node class.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { nodes } from "./_state";
import { destruct } from "./symbols";
import { Listenable } from "./Listenable";
import { MonitorableCheckpoint } from "./LogMessage";

/**
 * Returns node's index object.
 */
export function getIndexObject(node: Node): {
  parent?: Node;
  children: Array<Node>;
} {
  const index = nodes.get(node);
  if (!index) {
    const err = new Error(
      "The node object is missed in the nodes index map.",
    );
    node.logger.fatal(err);
    throw err;
  } else {
    return <{ parent?: Node; children: Array<Node> }>index;
  }
}

/**
 * Assert node's child node.
 */
export function assertChild(parent: Node, child: Node): void {
  getIndexObject(child);
  const pIndex = getIndexObject(parent);
  const i = pIndex.children.indexOf(child);
  if (!~i) {
    const err = new Error(
      "The given child node is missed in the " +
        "parent node children list.",
    );
    parent.logger.fatal(err);
    throw err;
  }
}

/**
 * Class that provides ability to build trees of `mln`-objects and
 * traverse through it. As a structure it additionally hosts
 * references to the tree root node, parent, previous and next nodes,
 * and children nodes array. There is also a flag which determine
 * whether the node is connected to some tree or not.
 *
 * You may subclass this class to turn your class
 * into a monitorable listenable node and build more complex tree
 * business structures from such nodes.
 */
export class Node extends Listenable {
  /**
   * Read-only property returns a boolean indicating whether the node
   * is connected to the tree.
   */
  get connected(): boolean {
    const index = getIndexObject(this);
    return index.parent || index.children.length ? true : false;
  }

  /**
   * Read-only property returns a root node of the tree if node is
   * connected, and reference to itself otherwise.
   */
  get root(): Node {
    let root: Node;
    let parent: Node | undefined;
    const index = getIndexObject(this);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    root = this;
    parent = index.parent;
    while (parent) {
      root = parent;
      parent = getIndexObject(root).parent;
    }
    return root;
  }

  /**
   * Read-only property returns a parent node if exist, null
   * otherwise.
   */
  get parent(): Node | null {
    const index = getIndexObject(this);
    return index.parent || null;
  }

  /**
   * Read-only property returns a next node from the parent's children
   * array if it exists, null otherwise.
   */
  get next(): Node | null {
    const index = getIndexObject(this);
    const parent = index.parent;
    if (parent) {
      const i = parent.children.indexOf(this);
      if (parent.children.length > i + 1) {
        return parent.children[i + 1];
      }
    }
    return null;
  }

  /**
   * Read-only property returns a previous node from the parent's
   * children array if it exists, null otherwise.
   */
  get previous(): Node | null {
    const index = getIndexObject(this);
    const parent = index.parent;
    if (parent) {
      const i = parent.children.indexOf(this);
      if (i > 0) {
        return parent.children[i - 1];
      }
    }
    return null;
  }

  /**
   * Read-only property returns a children nodes array, empty if there
   * is no any child nodes.
   */
  get children(): Array<Node> {
    const index = getIndexObject(this);
    const children: Array<Node> = [];
    for (let i = 0; i < index.children.length; i++) {
      children.push(index.children[i]);
    }
    return children;
  }

  /**
   * @override
   */
  public constructor() {
    super();

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Node.constructor()` call.",
      ),
    );

    // construct new node index and add it to the internal state
    nodes.set(this, {
      parent: undefined,
      children: [],
    });

    // this.logger.debug(NodeMapped);
  }

  /**
   * @override
   */
  protected [destruct](): void {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Node[destruct]()` call.",
      ),
    );

    // get current node index object
    const curIndex = getIndexObject(this);
    for (let i = 0; i < curIndex.children.length; i++) {
      curIndex.children[i].destructor();
    }

    // remove current node from the parent if specified
    if (curIndex.parent) {
      const parIndex = getIndexObject(curIndex.parent);
      const index = parIndex.children.indexOf(this);
      parIndex.children.splice(index, 1);
    }

    // remove current node index from the internal state
    nodes.delete(this);

    // this.logger.debug(NodeUnmapped);

    super[destruct]();
  }

  /**
   * Removes `child` node from the children list if it is already
   * there, then inserts it as a child `before` a reference node, if
   * specified, and the last in the children list otherwise.
   *
   * @param child Child node to insert.
   * @param before Reference node to insert before.
   *
   * @throw Error
   */
  insert(child: Node, before?: Node): Node {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Node.insert(" +
          `${child.uid}` +
          `${before ? ", " + before.uid : ""}` +
          ")` call.",
      ),
    );

    // assertion
    before && assertChild(this, before);

    // get node parent/child indecies
    const pIndex = getIndexObject(this);
    const cIndex = getIndexObject(child);

    // try to find child in the existing children list
    const children = pIndex.children;
    const i = children.indexOf(child);

    // remove child from the children list if exist
    if (~i) {
      children.splice(i, 1);

      // this.logger.debug(NodeChildRemoved);
    }
    if (!before) {
      // push child to the end of the children list if before is not
      // specified
      children.push(child);

      // this.logger.debug(NodeChildAdded);
    } else {
      // add child before the specified node
      const idx = children.indexOf(before);
      children.splice(idx, 0, child);

      // this.logger.debug(NodeChildAdded);
    }

    // set current node as a parent for child
    cIndex.parent = this;

    // this.logger.debug(NodeParentSetted);

    return child;
  }

  /**
   * Removes `to` node from the children list if it's already there,
   * and replace `existing` children node with it.
   *
   * @param existing Node to replace.
   * @param to Node to replace with.
   *
   * @throw Error
   */
  replace(existing: Node, to: Node): Node {
    // assertion
    assertChild(this, existing);

    // get current node (parent) index and child nodes indices
    const pIndex = getIndexObject(this);
    const eIndex = getIndexObject(existing);
    const tIndex = getIndexObject(to);
    const children = pIndex.children;

    // remove to-node from parent children list if exist
    if (~children.indexOf(to)) {
      const idx = children.indexOf(to);
      children.splice(idx, 1);
    }

    // unset existing-node parent field
    eIndex.parent = undefined;

    // set to-node parent field
    tIndex.parent = this;

    // replace existing-node to to-node
    const idx = children.indexOf(existing);
    children.splice(idx, 1, to);
    return existing;
  }

  /**
   * Removes specified `child` node from the children list.
   *
   * @param child Child node to remove.
   */
  remove(child: Node): Node {
    // assertions
    assertChild(this, child);

    // get parent and child indices
    const pIndex = getIndexObject(this);
    const cIndex = getIndexObject(child);

    // remove child node from parent children list
    const idx = pIndex.children.indexOf(child);
    pIndex.children.splice(idx, 1);

    // unset child node parent field
    cIndex.parent = undefined;
    return child;
  }
}
