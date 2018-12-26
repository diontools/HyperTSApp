import { h, app, Action, Effect } from './hypertsapp'

const initState = {
    value: 1,
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

const OnDelayed: Action<State, { startTime: string }> = (state, params) => {
    console.log('startTime', params.startTime, Date());
    return state
}

const Delay: Effect<{ interval: number }, { startTime: string }> = (props) => ({
    effect: (props, dispatch) => {
        props.params.startTime = Date()
        setTimeout(() => dispatch(props.action, props.params), props.interval)
    },
    ...props,
})

let ef = Delay({ action: OnDelayed, params: { startTime: '' }, interval: 1000 });

app({
    init: () => initState,
    view: (state, dispatch) => (
        <div>
            <button onclick={(ev: Event) => dispatch(Increment, {})}>increment</button>
            <button onclick={(ev: Event) => dispatch(Add, { amount: 10 })}>add10</button>
            <button onclick={(ev: Event) => dispatch([ef])}>add10</button>
            {state.value}
        </div>
    ),
    container: document.body,
})