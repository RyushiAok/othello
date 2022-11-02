import './App.css'
import Game from "@/pages/Game"
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import { useState } from 'react'
import useOthello from '@/hooks/useOthello'

function App() {
  const game = useOthello(false, true)
  return (
    <div className='App'>
      <h1>Othello</h1>
      <Game board={A.flatten(game.state.board)} handleClick={game.handleClick} />
      <h2>
        {
          game.state.status !== 'finished'
            ? <> turn {'>'}  {game.state.turn === 'X' ? 'black' : 'white'}</>
            : O.match(
              () => "draw",
              (side) => "winner > " + (side  === 'X' ? 'black' : 'white'),
            )(game.state.winner)
        }
      </h2>
      {
        game.state.status === 'finished'
          ? <button onClick={game.handleInit}>Restart</button>
          : <button onClick={game.handlePass}>Pass</button>
      }
    </div>
  )
}

export default App
