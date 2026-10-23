
import { useCallback, useEffect, useState } from 'react';
import wordList from '../../wordlist.txt?raw';
import './board.css';

const TARGET = 'POOP';
const STORAGE_KEY = 'poople-scores';

// Parse the word list once.
const WORDS = new Set(
    wordList
        .split(/\s+/)
        .map(word => word.trim().toUpperCase())
        .filter(word => /^[A-Z]{4}$/.test(word))
);

WORDS.add(TARGET);

// Build word patterns so neighbours can be found without scanning
// the entire word list for every guess.
const WORD_PATTERNS = new Map();

for (const word of WORDS) {
    for (let i = 0; i < 4; i++) {
        const pattern = word.slice(0, i) + '_' + word.slice(i + 1);

        if (!WORD_PATTERNS.has(pattern)) {
            WORD_PATTERNS.set(pattern, []);
        }

        WORD_PATTERNS.get(pattern).push(word);
    }
}

// Build the graph of words that differ by exactly one letter.
const NEIGHBOURS = new Map();

for (const word of WORDS) {
    const neighbours = new Set();

    for (let i = 0; i < 4; i++) {
        const pattern = word.slice(0, i) + '_' + word.slice(i + 1);

        for (const candidate of WORD_PATTERNS.get(pattern) || []) {
            if (candidate !== word) {
                neighbours.add(candidate);
            }
        }
    }

    NEIGHBOURS.set(word, [...neighbours]);
}

// Find shortest routes to POOP with one BFS.
const ROUTES_TO_TARGET = new Map([[TARGET, [TARGET]]]);
const queue = [TARGET];

for (let i = 0; i < queue.length; i++) {
    const word = queue[i];
    const route = ROUTES_TO_TARGET.get(word);

    for (const neighbour of NEIGHBOURS.get(word) || []) {
        if (ROUTES_TO_TARGET.has(neighbour)) continue;

        ROUTES_TO_TARGET.set(neighbour, [neighbour, ...route]);
        queue.push(neighbour);
    }
}

// Only allow starting words with routes of 6 words or fewer.
const POSSIBLE_STARTS = [...ROUTES_TO_TARGET.keys()].filter(
    word => word !== TARGET && ROUTES_TO_TARGET.get(word).length <= 6
);

function getNeighbours(word) {
    return NEIGHBOURS.get(word) || [];
}

function getBestRoute(start) {
    return ROUTES_TO_TARGET.get(start) || [];
}

// Select starting words using a 30/50/20 difficulty distribution.
function getRandomStart() {
    if (POSSIBLE_STARTS.length === 0) return TARGET;

    const easyStarts = POSSIBLE_STARTS.filter(
        word => ROUTES_TO_TARGET.get(word).length <= 3
    );

    const mediumStarts = POSSIBLE_STARTS.filter(
        word => {
            const length = ROUTES_TO_TARGET.get(word).length;
            return length >= 4 && length <= 5;
        }
    );

    const hardStarts = POSSIBLE_STARTS.filter(
        word => ROUTES_TO_TARGET.get(word).length === 6
    );

    const roll = Math.random();

    let pool;

    if (roll < 0.30 && easyStarts.length > 0) {
        pool = easyStarts;
    } else if (roll < 0.80 && mediumStarts.length > 0) {
        pool = mediumStarts;
    } else if (hardStarts.length > 0) {
        pool = hardStarts;
    } else {
        pool = POSSIBLE_STARTS;
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

function readSavedScores() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || '[]'
        );

        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function Board() {
    const [initialStart] = useState(() => getRandomStart());
    const [startWord, setStartWord] = useState(initialStart);
    const [guesses, setGuesses] = useState([initialStart]);
    const [input, setInput] = useState('');
    const [message, setMessage] = useState('');
    const [gameWon, setGameWon] = useState(initialStart === TARGET);
    const [showResults, setShowResults] = useState(false);
    const [savedScores, setSavedScores] = useState(readSavedScores);
    const [completedScore, setCompletedScore] = useState(null);

    const bestScore = savedScores.length
        ? Math.min(...savedScores.map(score => score.wordsUsed))
        : 0;

    // Distribution relative to the lowest number of words used.
    const distribution = [0, 0, 0, 0, 0];

        savedScores.forEach(score => {
        const shortestRouteLength = score.route?.length || score.wordsUsed;
        const difference = Math.max(
            0,
            score.wordsUsed - shortestRouteLength
        );

        distribution[Math.min(difference, 4)]++;
    });

    const maxDistribution = Math.max(...distribution, 1);

    const currentDifference = completedScore
    ? Math.max(
          0,
          completedScore.wordsUsed -
              (completedScore.route?.length || completedScore.wordsUsed)
      )
    : -1;

    useEffect(() => {
        const board = document.querySelector('.word-board');

        if (board) {
            board.scrollTop = board.scrollHeight;
        }
    }, [guesses, input]);

    const handleNewGame = useCallback(() => {
        const nextStart = getRandomStart();

        setStartWord(nextStart);
        setGuesses([nextStart]);
        setInput('');
        setMessage('');
        setGameWon(nextStart === TARGET);
        setShowResults(false);
        setCompletedScore(null);
    }, []);

    const handleSubmit = useCallback(() => {
        if (gameWon || showResults) return;

        const guess = input.trim().toUpperCase();

        if (guess.length !== 4) {
            setMessage('Enter a four-letter word.');
            return;
        }

        if (!WORDS.has(guess)) {
            setMessage('That word is not in the word list.');
            return;
        }

        const previousWord = guesses[guesses.length - 1];

        if (guess === previousWord) {
            setMessage('Choose a different word.');
            return;
        }

        if (!getNeighbours(previousWord).includes(guess)) {
            setMessage('Change exactly one letter.');
            return;
        }

        const updatedGuesses = [...guesses, guess];

        setGuesses(updatedGuesses);
        setInput('');
        setMessage('');

        if (guess === TARGET) {
            setGameWon(true);

            const score = {
                id: `${Date.now()}-${Math.random()}`,
                wordsUsed: updatedGuesses.length,
                startWord,
                route: getBestRoute(startWord),
                date: new Date().toLocaleDateString(),
            };

            const updatedScores = [...readSavedScores(), score];

            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(updatedScores)
                );
            } catch {
                // The game remains playable if storage is unavailable.
            }

            setSavedScores(updatedScores);
            setCompletedScore(score);
            setShowResults(true);
        }
    }, [gameWon, showResults, input, guesses, startWord]);

    const handleKey = useCallback((key) => {
        if (gameWon || showResults) return;

        if (key === 'ENTER') {
            handleSubmit();
            return;
        }

        if (key === 'BACKSPACE' || key === '⌫') {
            setInput(current => current.slice(0, -1));
            setMessage('');
            return;
        }

        if (/^[A-Z]$/.test(key)) {
            setInput(current =>
                current.length < 4 ? current + key : current
            );
            setMessage('');
        }
    }, [gameWon, showResults, handleSubmit]);

    useEffect(() => {
        function handlePhysicalKey(event) {
            if (showResults) {
                if (event.key === 'Escape') {
                    setShowResults(false);
                }
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
            } else if (event.key === 'Backspace') {
                event.preventDefault();
                handleKey('BACKSPACE');
            } else if (/^[a-zA-Z]$/.test(event.key)) {
                handleKey(event.key.toUpperCase());
            }
        }

        window.addEventListener('keydown', handlePhysicalKey);

        return () => {
            window.removeEventListener('keydown', handlePhysicalKey);
        };
    }, [handleSubmit, handleKey, showResults]);

    const keyboardRows = [
        'QWERTYUIOP'.split(''),
        'ASDFGHJKL'.split(''),
        ['ENTER', ...'ZXCVBNM'.split(''), 'BACKSPACE'],
    ];

    return (
        <div className="board-container">
            <div className="intro">
                <div className="title-container">
                    <h1 className="title">Poople</h1>
                    <img
                        src="/poople.png"
                        alt="Poople logo"
                        className="title-logo"
                    />
                </div>

                <p className="caption">
                    Unlimited version of the site{' '}
                    <span className="highlight">poople.io</span>
                </p>
            </div>

            <main className="board-main">
                <div className="word-board">
                    {guesses.map((word, rowIndex) => (
                        <div
                            className="board-row"
                            key={`${word}-${rowIndex}`}
                        >
                            {word.split('').map((letter, index) => (
                                <div
                                    className={`board-tile filled ${
                                        word === TARGET
                                            ? 'correct'
                                            : letter === TARGET[index]
                                                ? 'correct-letter'
                                                : ''
                                    }`}
                                    key={`${rowIndex}-${index}`}
                                >
                                    {letter}
                                </div>
                            ))}
                        </div>
                    ))}

                    {!gameWon && (
                        <div className="board-row">
                            {Array.from({ length: 4 }, (_, index) => (
                                <div
                                    className={`board-tile ${
                                        input[index] ? 'filled typing' : ''
                                    }`}
                                    key={index}
                                >
                                    {input[index] || ''}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {message && (
                    <p className="board-message" role="status">
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
            </main>

            <div className="keyboard">
                {keyboardRows.map((row, rowIndex) => (
                    <div className="keyboard-row" key={rowIndex}>
                        {row.map(key => {
                            const isAction =
                                key === 'ENTER' || key === 'BACKSPACE';

                            return (
                                <button
                                    type="button"
                                    key={key}
                                    className={`keyboard-key ${
                                        isAction ? 'action-key' : ''
                                    }`}
                                    onClick={() => handleKey(key)}
                                    aria-label={
                                        key === 'BACKSPACE'
                                            ? 'Backspace'
                                            : key
                                    }
                                >
                                    {key === 'BACKSPACE' ? '⌫' : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {showResults && completedScore && (
                <div
                    className="results-overlay"
                    onClick={event => {
                        if (event.target === event.currentTarget) {
                            setShowResults(false);
                        }
                    }}
                >
                    <div
                        className="results-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="results-heading"
                    >
                        <button
                            className="results-close"
                            onClick={() => setShowResults(false)}
                            aria-label="Close results"
                        >
                            ×
                        </button>

                        <h2 id="results-heading">You got POOP!</h2>

                        <p className="results-subtitle">
                            You reached the target in{' '}
                            {completedScore.wordsUsed}{' '}
                            {completedScore.wordsUsed === 1
                                ? 'word'
                                : 'words'}.
                        </p>

                        <h3>STATISTICS</h3>

                        <div className="results-stats-grid">
                            <div className="results-stat-card">
                                <strong>{savedScores.length}</strong>
                                <span>Games played</span>
                            </div>

                            <div className="results-stat-card">
                                <strong>
                                    {savedScores.length
                                        ? (
                                              savedScores.reduce(
                                                  (sum, score) =>
                                                      sum + score.wordsUsed,
                                                  0
                                              ) / savedScores.length
                                          ).toFixed(1)
                                        : '0'}
                                </strong>
                                <span>Average words</span>
                            </div>

                            <div className="results-stat-card">
                                <strong>{bestScore || '—'}</strong>
                                <span>Best score</span>
                            </div>
                        </div>

                        <h3>WORDS OVER SHORTEST ROUTE</h3>

                        <div className="guess-distribution">
                            {distribution.map((count, index) => {
                                const isCurrentScore =
                                    index === 4
                                        ? currentDifference >= 4
                                        : currentDifference === index;

                                return (
                                    <div
                                        className="distribution-row"
                                        key={index}
                                    >
                                        <span className="distribution-label">
                                            {index === 4 ? '4+' : index}
                                        </span>

                                        <div className="distribution-track">
                                            <div
                                                className={`distribution-bar ${
                                                    isCurrentScore
                                                        ? 'current-score'
                                                        : ''
                                                }`}
                                                style={{
                                                    width: count
                                                        ? `${Math.max(
                                                              (count /
                                                                  maxDistribution) *
                                                                  100,
                                                              8
                                                          )}%`
                                                        : '0%',
                                                }}
                                            >
                                                {count > 0 ? count : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <h3>SHORTEST ROUTE</h3>

                        <div className="results-route">
                            {completedScore.route?.length
                                ? completedScore.route.map((word, index) => (
                                      <span key={`${word}-${index}`}>
                                          <strong>{word}</strong>
                                          {index <
                                              completedScore.route.length - 1 &&
                                              ' → '}
                                      </span>
                                  ))
                                : 'No route available.'}
                        </div>

                        <button
                            className="new-game-button results-play-again"
                            onClick={handleNewGame}
                        >
                            Play Again
                        </button>

                        <p className="score-date">
                            *Only completed wins are saved, so this is not a
                            true win rate.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Board;
