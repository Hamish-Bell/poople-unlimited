
import { useState } from 'react'
import wordList from "../../wordlist.txt?raw";
import './board.css'

const TARGET = 'poop'

const words = [
  ...new Set(
    wordList
      .split(/\r?\n/)
      .map(word => word.trim().toLowerCase())
      .filter(word => /^[a-z]{4}$/.test(word))
  ),
]

const wordSet = new Set(words)

function buildPaths() {
  const paths = new Map()
  const queue = [TARGET]

  if (!wordSet.has(TARGET)) {
    console.error('Your wordlist.txt must contain "poop".')
    return paths
  }

  paths.set(TARGET, TARGET)

  let index = 0

  while (index < queue.length) {
    const current = queue[index++]

    for (let position = 0; position < 4; position++) {
      for (let code = 97; code <= 122; code++) {
        const letter = String.fromCharCode(code)

        if (letter === current[position]) continue

        const next =
          current.slice(0, position) +
          letter +
          current.slice(position + 1)

        if (wordSet.has(next) && !paths.has(next)) {
          paths.set(next, current)
          queue.push(next)
        }
      }
    }
  }

  return paths
}

const paths = buildPaths()

function getRandomStart() {
  const availableWords = [...paths.keys()].filter(
    word => word !== TARGET
  )

  if (availableWords.length === 0) {
    return TARGET
  }

  return availableWords[
    Math.floor(Math.random() * availableWords.length)
  ]
}

function differsByOne(first, second) {
  let differences = 0

  for (let i = 0; i < 4; i++) {
    if (first[i] !== second[i]) {
      differences++
    }
  }

  return differences === 1
}

function Board() {
  const [startWord] = useState(getRandomStart)
  const [guesses, setGuesses] = useState([startWord])
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState(2)
  const [gameWon, setGameWon] = useState(startWord === TARGET)

  function handleSubmit(event) {
    event.preventDefault()

    if (gameWon) return

    const guess = input.trim().toLowerCase()
    const previousWord = guesses[guesses.length - 1]

    if (!/^[a-z]{4}$/.test(guess)) {
      setMessage('Enter a four-letter word.')
      return
    }

    if (!wordSet.has(guess)) {
      setMessage('That word is not in the dictionary.')
      return
    }

    if (guesses.includes(guess)) {
      setMessage('You have already used that word.')
      return
    }

    if (!differsByOne(previousWord, guess)) {
      setMessage('Change exactly one letter.')
      return
    }

    if (!paths.has(guess)) {
      setMessage('That word cannot reach POOP. Try another!')
      return
    }

    setGuesses(previous => [...previous, guess])
    setInput('')
    setMessage('')

    if (guess === TARGET) {
      setGameWon(true)
      setMessage('You got it! 🎉')
    } else {
      setRows(previous => Math.max(previous, guesses.length + 2))
    }
  }

  function handleNewGame() {
    const nextStart = getRandomStart()

    setGuesses([nextStart])
    setInput('')
    setMessage('')
    setRows(2)
    setGameWon(nextStart === TARGET)
  }


  return (
    <div className="board-container">
      <div className="intro">
        <h1 className="title">Poople</h1>
        <p className="caption">
          Unlimited version of the site <span className='highlight'>poople.io</span>
        </p>
      </div>

      <div className="board-main">
        <div className="word-board">
          {Array.from({ length: rows }, (_, rowIndex) => {
            const word = guesses[rowIndex] || ''

            return (
              <div className="board-row" key={rowIndex}>
                {Array.from({ length: 4 }, (_, letterIndex) => (
                  <div
                    className={`board-tile ${
                      word ? 'filled' : ''
                    } ${
                      word === TARGET ? 'correct' : ''
                    }`}
                    key={letterIndex}
                  >
                    {word[letterIndex]?.toUpperCase() || ''}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {!gameWon && (
          <form className="guess-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={event => {
                setInput(
                  event.target.value
                    .replace(/[^a-zA-Z]/g, '')
                    .slice(0, 4)
                )
              }}
              placeholder="Enter a word"
              maxLength={4}
              autoComplete="off"
              autoCapitalize="none"
              aria-label="Enter a four-letter word"
            />

            <button type="submit">Guess</button>
          </form>
        )}

        {message && (
          <p className="board-message" aria-live="polite">
            {message}
          </p>
        )}

        {gameWon && (
          <button
            className="new-game-button"
            onClick={handleNewGame}
          >
            Play Again
          </button>
        )}

        <p className="guess-count">
          Words used: {guesses.length}
        </p>
      </div>
    </div>
  )

}

export default Board
