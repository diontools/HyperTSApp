import { h, app, Action, Effect, Subscription } from './hypertsapp'

const initState = {
    value: 1,
    text: '',
    auto: false,
    count: 0,
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

const Delay = new Effect<{ interval: number }, { startTime: string }>((props) => ({
    effect: (props, dispatch) => {
        const params = {
            ...props.params,
            startTime: Date()
        }
        setTimeout(() => dispatch(props.action, params), props.interval)
    },
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


const Timer = new Subscription<{ interval: number }, { count: number }>((props, dispatch) => {
    let count = 0;
    const id = setInterval(() => {
        dispatch(props.action, {
            ...props.params,
            count: ++count,
        })
    }, props.interval)
    return () => clearInterval(id)
}, (props, runner) => ({
    effect: runner,
    ...props,
}))

const OnTimer = Timer.createAction<State, {}>((state, params) => ({
    ...state,
    value: state.value + 1,
    count: params.count,
}))

const ToggleTimer: Action<State> = state => ({
    ...state,
    auto: !state.auto,
})


app({
    init: () => initState,
    view: (state, dispatch) => (
        <div>
            <button onclick={(ev: Event) => dispatch(Increment)}>increment</button>
            <button onclick={(ev: Event) => dispatch(Add, { amount: 10 })}>add10</button>
            <button onclick={(ev: Event) => dispatch(DelayAdd, { interval: 1000, amount: 50 })}>add10</button>
            <button onclick={(ev: Event) => dispatch(ToggleTimer)}>auto:{state.auto ? 'true' : 'false'}</button>
            {state.value} text:{state.text} count:{state.count}
        </div>
    ),
    subscriptions: state => state.auto && Timer.create({ action: OnTimer, params: {}, interval: 500 }),
    container: document.body,
})