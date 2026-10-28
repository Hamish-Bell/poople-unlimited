import './App.css'

import { Analytics } from '@vercel/analytics/react'
import Board from './components/board/board.jsx'

function App() {

  return (
    <>
      <Board/>
      <Analytics />
    </>
  )
}

export default App
