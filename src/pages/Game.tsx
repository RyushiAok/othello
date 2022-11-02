import { Side } from '@/types/Side'
import Square from '@/components/Square'
import * as O from 'fp-ts/Option'

interface Props { 
    board: O.Option<Side>[]
    handleClick(index: number): void;
}

const Game = (props: Props) => { 
    const { board, handleClick } = props 
    const styles = {
        board: {
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)', 
            color: 'white', 
            backgroundColor: 'darkgreen',
        },
        buttonG: {
            width: '30px',
            height : "40px",
            fontSize: '15px', 
            margin: '2px', 
            backgroundColor: 'green',
        },
        buttonB: {
            width: '30px',
            height : "40px",
            fontSize: '15px', 
            margin: '2px', 
            backgroundColor: '#111',
        },
        buttonW: {
            width: '30px',
            height : "40px",
            fontSize: '15px', 
            margin: '2px', 
            backgroundColor: '#ccc',
        }
    }
    return ( 
        <div style={styles.board}>
            {board.map((side, index) => (
                <Square
                    key={index}
                    value={side}
                    index={index}
                    styleG={styles.buttonG}
                    styleB={styles.buttonB}
                    styleW={styles.buttonW}
                    handleClick={handleClick} 
                />))
            }
        </div> 
    )
}
export default Game