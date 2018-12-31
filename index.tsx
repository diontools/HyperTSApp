import { h, app, Action, Effect, Subscription } from './HyperTSApp'

const initState = {
    value: 1,
    text: '',
    auto: false,
    count: 0,
    input: '',
}

type State = typeof initState;

const Increment: Action<State> = state => ({
    ...state,
    value: state.value + 1,
})

const Add: Action<State, { amount: number }> = (state, params) => ({
    ...state,
    value: state.value + params.amount,
})


const Delay = new Effect<{ interval: number }, { startTime: string }>((props, dispatch) => {
    const startTime = Date()
    setTimeout(() => dispatch(props.action, { ...props.params, startTime }), props.interval)
}, (props, runner) => ({
    effect: runner,
    ...props,
}))

const OnDelayed = Delay.createAction<State, { amount: number }>((state, params) => ({
    ...state,
    value: state.value + params.amount,
    text: params.startTime,
}))

const DelayAdd: Action<State, { interval: number, amount: number }> = (state, params) => [
    state,
    [Delay.create({ action: OnDelayed, params: { amount: params.amount }, interval: params.interval })]
]


const Tick = new Subscription<{ interval: number }, { count: number }>((props, dispatch) => {
    let count = 0;
    const id = setInterval(
        () => dispatch(props.action, { ...props.params, count: ++count, }),
        props.interval
    )
    return () => clearInterval(id)
}, (props, runner) => ({
    effect: runner,
    ...props,
}))

const OnTimer = Tick.createAction<State, {}>((state, params) => ({
    ...state,
    value: state.value + 1,
    count: params.count,
}))

const ToggleTimer: Action<State> = state => ({
    ...state,
    auto: !state.auto,
})


const Input: Action<State, string> = (state, value) => ({ ...state, input: value })

app({
    init: () => [initState, [Delay.create({ action: OnDelayed, params: { amount: 10 }, interval: 1000 })]],
    view: (state, dispatch) => (
        <div>
            <button onClick={ev => dispatch(Increment)}>increment</button>
            <button onClick={ev => dispatch(Add, { amount: 10 })}>add10</button>
            <button onClick={ev => dispatch(DelayAdd, { interval: 1000, amount: 50 })}>delayAdd</button>
            <button onClick={ev => dispatch(ToggleTimer)}>auto:{state.auto ? 'true' : 'false'}</button>
            <p>value: {state.value}</p>
            <p>text: {state.text}</p>
            <p>count: {state.count}</p>
            <p>
                input: <input type="text" value={state.input} onInput={ev => dispatch(Input, ev.currentTarget.value) } /> → {state.input}
            </p>
        </div>
    ),
    subscriptions: state => state.auto && Tick.create({ action: OnTimer, params: {}, interval: 500 }),
    container: document.body,
})