import { h, app } from './hypertsapp'

const initState = {
    value: 1,
}

const Test = (state: typeof initState) => ({
    ...state,
    value: state.value + 1,
})

app({
    init: initState,
    view: state => (
        <div>
            <button onClick={Test}>add</button>
            {state.value}
        </div>
    ),
    container: document.body,
})