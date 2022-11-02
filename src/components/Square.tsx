import { Side } from '@/types/Side'
import * as O from 'fp-ts/Option'

interface Props {
    index: number
    value: O.Option<Side>
    styleG: React.CSSProperties
    styleB: React.CSSProperties
    styleW: React.CSSProperties
    handleClick: (index: number) => void
}

const Square = (props: Props) => {
    const { index, value, styleG, styleB, styleW, handleClick } = props  
    return (
        <button 
            style= 
                {
                    O.match(
                        () => styleG,
                        (side: Side) => {
                            switch (side) {
                                case 'X': return styleB
                                case 'O': return styleW
                            } 
                        }
                    ) (value)
                }
            onClick={() => handleClick(index)}> 
        </button>
    )
}
export default Square
