var DEFAULT = 0
var RECYCLED_NODE = 1
var TEXT_NODE = 3 // Node.TEXT_NODE

var XLINK_NS = "http://www.w3.org/1999/xlink"
var SVG_NS = "http://www.w3.org/2000/svg"

var EMPTY_OBJECT = {}
var EMPTY_ARRAY: any[] = []

var map = EMPTY_ARRAY.map
var isArray = Array.isArray

var merge = function <T1, T2>(a: T1, b: T2): T1 & T2 {
    var target: any = {}

    for (let i in a) target[i] = a[i]
    for (let i in b) target[i] = b[i]

    return target
}

var resolved = typeof Promise === "function" ? Promise.resolve() : undefined

var defer = !resolved
    ? setTimeout
    : function (cb: any) {
        return resolved!.then(cb)
    }

var updateProperty = function (
    element: any,
    name: string,
    lastValue: any,
    nextValue: any,
    isSvg: boolean
) {
    if (name === "key") {
    } else if (name === "style") {
        for (var i in merge(lastValue, nextValue)) {
            var style = nextValue == null || nextValue[i] == null ? "" : nextValue[i]
            if (i[0] === "-") {
                element[name].setProperty(i, style)
            } else {
                element[name][i] = style
            }
        }
    } else {
        var nullOrFalse = nextValue == null || nextValue === false

        if (
            name in element &&
            name !== "list" &&
            name !== "draggable" &&
            name !== "spellcheck" &&
            name !== "translate" &&
            !isSvg
        ) {
            element[name] = nextValue == null ? "" : nextValue
            if (nullOrFalse) {
                element.removeAttribute(name)
            }
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink:?/, ""))
            if (ns) {
                if (nullOrFalse) {
                    element.removeAttributeNS(XLINK_NS, name)
                } else {
                    element.setAttributeNS(XLINK_NS, name, nextValue)
                }
            } else {
                if (nullOrFalse) {
                    element.removeAttribute(name)
                } else {
                    element.setAttribute(name, nextValue)
                }
            }
        }
    }
}

var createElement = function (node: VNode, lifecycle: Function[], isSvg: boolean) {
    var element =
        node.type === TEXT_NODE
            ? document.createTextNode(node.name)
            : (isSvg = isSvg || node.name === "svg")
                ? document.createElementNS(SVG_NS, node.name)
                : document.createElement(node.name)

    var props: any = node.props
    if (props.onCreate) {
        lifecycle.push(function () {
            props.onCreate(element)
        })
    }

    for (var i = 0, length = node.children.length; i < length; i++) {
        element.appendChild(
            createElement(node.children[i], lifecycle, isSvg)
        )
    }

    for (var name in props) {
        updateProperty(element, name, null, props[name], isSvg)
    }

    return (node.element = element)
}

var updateElement = function (
    element: any,
    lastProps: any,
    nextProps: any,
    lifecycle: Function[],
    isSvg: any,
    isRecycled: any
) {
    for (var name in merge(lastProps, nextProps)) {
        if (
            (name === "value" || name === "checked"
                ? element[name]
                : lastProps[name]) !== nextProps[name]
        ) {
            updateProperty(
                element,
                name,
                lastProps[name],
                nextProps[name],
                isSvg
            )
        }
    }

    var cb = isRecycled ? nextProps.onCreate : nextProps.onUpdate
    if (cb != null) {
        lifecycle.push(function () {
            cb(element, lastProps)
        })
    }
}

var removeChildren = function (node: any) {
    for (var i = 0, length = node.children.length; i < length; i++) {
        removeChildren(node.children[i])
    }

    var cb = node.props.onDestroy
    if (cb != null) {
        cb(node.element)
    }

    return node.element
}

var removeElement = function (parent: any, node: any) {
    var remove = function () {
        parent.removeChild(removeChildren(node))
    }

    var cb = node.props && node.props.onRemove
    if (cb != null) {
        cb(node.element, remove)
    } else {
        remove()
    }
}

var getKey = function (node: any) {
    return node == null ? null : node.key
}

var createKeyMap = function (children: any, start: any, end: any) {
    var out: any = {}
    var key
    var node

    for (; start <= end; start++) {
        if ((key = (node = children[start]).key) != null) {
            out[key] = node
        }
    }

    return out
}

var patchElement = function (
    parent: Element | Text | undefined,
    element: Element | Text | undefined,
    lastNode: VNode | null,
    nextNode: VNode,
    lifecycle: Function[],
    isSvg: boolean
) {
    if (nextNode === lastNode) {
    } else if (
        lastNode != null &&
        lastNode.type === TEXT_NODE &&
        nextNode.type === TEXT_NODE
    ) {
        if (lastNode.name !== nextNode.name) {
            element!.nodeValue = nextNode.name
        }
    } else if (lastNode == null || lastNode.name !== nextNode.name) {
        var newElement = parent!.insertBefore(
            createElement(nextNode, lifecycle, isSvg),
            element!
        )

        if (lastNode != null) removeElement(parent, lastNode)

        element = newElement
    } else {
        updateElement(
            element,
            lastNode.props,
            nextNode.props,
            lifecycle,
            (isSvg = isSvg || nextNode.name === "svg"),
            lastNode.type === RECYCLED_NODE
        )

        var savedNode
        var childNode

        var lastKey
        var lastChildren = lastNode.children
        var lastChStart = 0
        var lastChEnd = lastChildren.length - 1

        var nextKey
        var nextChildren = nextNode.children
        var nextChStart = 0
        var nextChEnd = nextChildren.length - 1

        while (nextChStart <= nextChEnd && lastChStart <= lastChEnd) {
            lastKey = getKey(lastChildren[lastChStart])
            nextKey = getKey(nextChildren[nextChStart])

            if (lastKey == null || lastKey !== nextKey) break

            patchElement(
                element,
                lastChildren[lastChStart].element,
                lastChildren[lastChStart],
                nextChildren[nextChStart],
                lifecycle,
                isSvg
            )

            lastChStart++
            nextChStart++
        }

        while (nextChStart <= nextChEnd && lastChStart <= lastChEnd) {
            lastKey = getKey(lastChildren[lastChEnd])
            nextKey = getKey(nextChildren[nextChEnd])

            if (lastKey == null || lastKey !== nextKey) break

            patchElement(
                element,
                lastChildren[lastChEnd].element,
                lastChildren[lastChEnd],
                nextChildren[nextChEnd],
                lifecycle,
                isSvg
            )

            lastChEnd--
            nextChEnd--
        }

        if (lastChStart > lastChEnd) {
            while (nextChStart <= nextChEnd) {
                element!.insertBefore(
                    createElement(
                        nextChildren[nextChStart++],
                        lifecycle,
                        isSvg
                    ),
                    (childNode = lastChildren[lastChStart]) && childNode.element!
                )
            }
        } else if (nextChStart > nextChEnd) {
            while (lastChStart <= lastChEnd) {
                removeElement(element, lastChildren[lastChStart++])
            }
        } else {
            var lastKeyed = createKeyMap(lastChildren, lastChStart, lastChEnd)
            var nextKeyed: any = {}

            while (nextChStart <= nextChEnd) {
                lastKey = getKey((childNode = lastChildren[lastChStart]))
                nextKey = getKey(nextChildren[nextChStart])

                if (
                    nextKeyed[lastKey] ||
                    (nextKey != null && nextKey === getKey(lastChildren[lastChStart + 1]))
                ) {
                    if (lastKey == null) {
                        removeElement(element, childNode)
                    }
                    lastChStart++
                    continue
                }

                if (nextKey == null || lastNode.type === RECYCLED_NODE) {
                    if (lastKey == null) {
                        patchElement(
                            element,
                            childNode && childNode.element,
                            childNode,
                            nextChildren[nextChStart],
                            lifecycle,
                            isSvg
                        )
                        nextChStart++
                    }
                    lastChStart++
                } else {
                    if (lastKey === nextKey) {
                        patchElement(
                            element,
                            childNode.element,
                            childNode,
                            nextChildren[nextChStart],
                            lifecycle,
                            isSvg
                        )
                        nextKeyed[nextKey] = true
                        lastChStart++
                    } else {
                        if ((savedNode = lastKeyed[nextKey]) != null) {
                            patchElement(
                                element,
                                element!.insertBefore(
                                    savedNode.element,
                                    childNode && childNode.element!
                                ),
                                savedNode,
                                nextChildren[nextChStart],
                                lifecycle,
                                isSvg
                            )
                            nextKeyed[nextKey] = true
                        } else {
                            patchElement(
                                element,
                                childNode && childNode.element,
                                null,
                                nextChildren[nextChStart],
                                lifecycle,
                                isSvg
                            )
                        }
                    }
                    nextChStart++
                }
            }

            while (lastChStart <= lastChEnd) {
                if (getKey((childNode = lastChildren[lastChStart++])) == null) {
                    removeElement(element, childNode)
                }
            }

            for (var key in lastKeyed) {
                if (nextKeyed[key] == null) {
                    removeElement(element, lastKeyed[key])
                }
            }
        }
    }

    return (nextNode.element = element)
}

var createVNode = function (name: string, props: any, children: any[], element: Element | undefined, key: any, type: number): VNode {
    return {
        name: name,
        props: props,
        children: children,
        element: element,
        key: key,
        type: type
    }
}

var createTextVNode = function (text: string, element?: Element) {
    return createVNode(text, EMPTY_OBJECT, EMPTY_ARRAY, element, null, TEXT_NODE)
}

var recycleChild = function (element: Element): VNode {
    return element.nodeType === TEXT_NODE
        ? createTextVNode(element.nodeValue!, element)
        : recycleElement(element)
}

var recycleElement = function (element: Element) {
    return createVNode(
        element.nodeName.toLowerCase(),
        EMPTY_OBJECT,
        map.call(element.childNodes, recycleChild),
        element,
        null,
        RECYCLED_NODE
    )
}

var patch = function (container: Element, element: Element | Text | undefined, lastNode: VNode, nextNode: VNode) {
    var lifecycle: Function[] = []

    element = patchElement(
        container,
        element,
        lastNode,
        nextNode,
        lifecycle,
        false
    )

    while (lifecycle.length > 0) lifecycle.pop()!()

    return element
}

export var h = function (name: string | Function, props: any) {
    var node
    var rest = []
    var children = []
    var length = arguments.length

    while (length-- > 2) rest.push(arguments[length])

    if ((props = props == null ? {} : props).children != null) {
        if (rest.length <= 0) {
            rest.push(props.children)
        }
        delete props.children
    }

    while (rest.length > 0) {
        if (isArray((node = rest.pop()))) {
            for (length = node.length; length-- > 0;) {
                rest.push(node[length])
            }
        } else if (node === false || node === true || node == null) {
        } else {
            children.push(typeof node === "object" ? node : createTextVNode(node))
        }
    }

    return typeof name === "function"
        ? name(props, (props.children = children))
        : createVNode(name, props, children, undefined, props.key, DEFAULT)
}

var cancel = function (sub: any) {
    sub.cancel()
}

var isSameValue = function (a: any, b: any) {
    if (a !== b) {
        for (var k in merge(a, b)) {
            if (a[k] !== b[k]) return false
        }
    }
    return true
}

var isSameAction = function (a: any, b: any) {
    return (
        typeof a === typeof b &&
        (isArray(a) && a[0] === b[0] && isSameValue(a[1], b[1]))
    )
}

var restart = function (sub: any, oldSub: any, dispatch: any) {
    for (var k in merge(sub, oldSub)) {
        if (k === "cancel") {
        } else if (sub[k] === oldSub[k] || isSameAction(sub[k], oldSub[k])) {
        } else {
            cancel(oldSub)
            return start(sub, dispatch)
        }
    }
    return oldSub
}

var start = function (sub: any, dispatch: any) {
    return merge(sub, {
        cancel: sub.effect(sub, dispatch)
    })
}

var refresh = function (sub: any, oldSub: any, dispatch: any): any {
    if (isArray(sub) || isArray(oldSub)) {
        var out = []
        var subs = isArray(sub) ? sub : [sub]
        var oldSubs = isArray(oldSub) ? oldSub : [oldSub]

        for (var i = 0; i < subs.length || i < oldSubs.length; i++) {
            out.push(refresh(subs[i], oldSubs[i], dispatch))
        }

        return out
    }

    return sub
        ? oldSub
            ? restart(sub, oldSub, dispatch)
            : start(sub, dispatch)
        : oldSub
            ? cancel(oldSub)
            : oldSub
}

export type Action<S, P = {}> = (state: S, params: P) => S | [S, EffectObjectBase[]?]

export type EffectRunner<S, P> = (
    props: P,
    dispatch: Dispatch<S>
) => void

interface EffectObjectBase {
    effect: EffectRunner<any, any>
}

interface GenericEffectObjectBase<S, P> extends EffectObjectBase {
    effect: EffectRunner<S, P>
}

export type EffectObject<S, P> = GenericEffectObjectBase<S, P> & P

export class Effect<Props, ReturnProps = {}, RunnerProps = Props> {
    public constructor(
        public create: <S, P>(props: { action: Action<S, P & ReturnProps>, params: P } & Props) =>
            EffectObject<S, { action: Action<S, P & ReturnProps>, params: P } & RunnerProps>) {
    }

    createAction<S, P>(action: Action<S, P & ReturnProps>): Action<S, P & ReturnProps> {
        return action
    }
}

export type SubscriptionEffectRunner<S, P> = (props: P, dispatch: Dispatch<S>) => () => void

interface SubscriptionObjectBase {
    effect: SubscriptionEffectRunner<any, any>
}

interface GenericSubscriptionObjectBase<S, P> extends SubscriptionObjectBase {
    effect: SubscriptionEffectRunner<S, P>
}

export type SubscriptionObject<S, P> = GenericSubscriptionObjectBase<S, P> & P

export class Subscription<Props, ReturnProps = {}, RunnerProps = Props>{
    // public constructor(
    //     runner: <S, P>() => SubscriptionEffectRunner<S, { action: Action<S, P & ReturnProps>, params: P } & RunnerProps>) {
    //     this.create = <S, P>(props) => ({ effect: runner(), ...props })
    // }

    // create: <S, P>(props: { action: Action<S, P & ReturnProps>, params: P } & Props) => SubscriptionObject<S, { action: Action<S, P & ReturnProps>, params: P } & RunnerProps>
    public constructor(
        public create: <S, P>(props: { action: Action<S, P & ReturnProps>, params: P } & Props) =>
            SubscriptionObject<S, { action: Action<S, P & ReturnProps>, params: P } & RunnerProps>
    ) {
    }

    createAction<S, P>(action: Action<S, P & ReturnProps>): Action<S, P & ReturnProps> {
        return action
    }
}

export type SubscriptionType = SubscriptionObjectBase | boolean

export type SubscriptionsResult =
    | void
    | SubscriptionType
    | SubscriptionType[]

export type Dispatch<S> = {
    <P>(action: Action<S, P>, params: P): void
    (action: Action<S, {}>): void
}

export type AppProps<S> = {
    init: Action<S>,
    view?: ((state: S, dispatch: Dispatch<S>) => VNode),
    subscriptions?: (state: S) => SubscriptionsResult,
    container: Element
}

export function app<S>(props: AppProps<S>) {
    var state: S
    var view = props.view
    var subs = props.subscriptions
    var container = props.container
    var element: Element | Text | undefined = container.children[0]
    var lastNode = element && recycleElement(element)
    var lastSub: any[] = []
    var updateInProgress = false

    var setState = function (newState: S) {
        if (state !== newState) {
            state = newState

            if (!updateInProgress) {
                updateInProgress = true
                defer(render)
            }
        }
    }

    var dispatch: Dispatch<S> = function <P>(action: Action<S, P>, params?: P) {
        let result = action(state, params!)
        if (isArray(result)) {
            setState(result[0])
            let effects = result[1]
            if (effects) {
                for (let e of effects) {
                    e.effect(e, dispatch)
                }
            }
        } else {
            setState(result)
        }
    }

    var render = function () {
        updateInProgress = false

        if (subs) {
            lastSub = refresh(subs(state), lastSub, dispatch)
        }

        if (view) {
            element = patch(
                container,
                element,
                lastNode,
                (lastNode = view(state, dispatch))
            )
        }
    }

    dispatch(props.init, {})
}

export type Children = VNode | string | number | null

export enum VNodeType {
    DEFAULT = 0,
    RECYCLED_NODE,
    TEXT_NODE,
}

export interface VNode<Props = {}> {
    name: string,
    props: Props,
    children: Array<VNode>
    element: Element | Text | undefined,
    key: string,
    type: VNodeType
}

declare global {
    namespace JSX {
        interface Element extends VNode<any> { }
        interface IntrinsicElements {
            [elemName: string]: any
        }
    }
}