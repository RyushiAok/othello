import { useEffect, useReducer, useState } from 'react' 
import * as O from 'fp-ts/Option'   
import * as A from 'fp-ts/Array'
import * as F from 'fp-ts/function' 
import { Side } from '@/types/Side'
import { GameStatus } from '@/types/GameStatus'   

type Board = O.Option<Side>[][]

module Board {  
    const turnover = 
        (acc: [number, number][], board: Board) => 
        (me: Side, opponent: Side) => 
        (x: number, y: number, dx: number, dy: number) : [number, number][] => { 
        const nextX = x + dx
        const nextY = y + dy
        if ( (nextX < 0 || nextX >= 8 || nextY < 0 || nextY >= 8)) {  
            return [] 
        } else { 
            return ( 
                F.pipe(
                    board[nextY][nextX],
                    O.match (
                        () => [],
                        (side) => {
                            if (side === me) {  
                                return acc
                            }
                            else {  
                                return turnover (A.append<[number, number]>([nextX, nextY]) (acc) , board) (me, opponent) (nextX, nextY, dx, dy)
                            }
                        }
                    )
                ) 
            ) 
        }
    }
    export const trySet = (x: number, y: number) => (side: Side) => (board: Board) : O.Option<Board> => { 
        const opponent = side === 'X' ? 'O' : 'X'
        const nextBoard = board.map(A.copy)
        const dirs = [
            [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1] 
        ]
        return ( 
            F.pipe(
                dirs,
                A.map(([dx, dy]) => turnover ([], nextBoard) (side, opponent) (x, y, dx, dy)),
                A.flatten,
                (turnOvers) => {
                    if (turnOvers.length > 0) {  
                        nextBoard[y][x] = O.some(side) 
                        for (const [sx, sy] of turnOvers) {
                            nextBoard[sy][sx] = O.some(side)
                        }   
                        return O.some(nextBoard)
                    }
                    else {
                        return O.none
                    } 
                }
            ) 
        ) 
    }
     
    export const getSelectableSpace = (side : Side) => (board: Board)  : [number, number][]=> { 
        const opponent = side === 'X' ? 'O' : 'X'
        const dirs = [
            [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1] 
        ] 
        return (F.pipe (
            [...Array(64)].map<[number, number]>((_, i) => [i % 8, Math.floor(i / 8)]),
            A.filter<[number, number]>(([x, y]) => O.isNone(board[y][x])),
            A.filter<[number, number]>(([x, y]) => F.pipe(
                    dirs,
                    A.exists(([dx, dy]) => {
                        const t = turnover ([], board) (side, opponent) (x, y, dx, dy)
                        return t.length > 0
                    })
                )
            ) 
        ))
    } 

    export const score = (turn: Side) => (board: Board) : number =>
        F.pipe( 
            board,
            A.flatten,
            A.filter(O.isSome),
            A.filter((side) => side.value === turn)
        ).length

    export const isFinished = (board: Board) : O.Option<O.Option<Side>> => {
        if (getSelectableSpace ('X') (board).length === 0 && getSelectableSpace ('O') (board).length === 0) {
            const score_X = score ('X') (board)
            const score_O = score ('O') (board)
            return O.some(
                  score_X > score_O ? O.some('X') 
                : score_X < score_O ? O.some('O') 
                : O.none
            )
        }
        else  
            return O.none 
    }  

    export const count = (board: Board) => 
        F.pipe (
            board,
            A.flatten,
            A.filter(O.isSome),
        ).length 

    export const init = (): Board => 
        F.pipe( 
            Array(8).fill([]),
            A.map((_) => Array(8).fill(O.none)),
            (ary) => { 
                ary[3][3] = O.some('X')
                ary[4][4] = O.some('X')
                ary[3][4] = O.some('O')
                ary[4][3] = O.some('O')
                return ary
            }
        )
}
 
module CPU { 
    const edgeFixed = (edge: O.Option<Side>[], turn: Side) : number => { //（確定石）→（不明）→（確定石）と並んでいれば、不明は確定石と定まる 
        const countEmpty = (edge: O.Option<Side>[] ) => {
            return F.pipe(
                edge,
                A.filter(O.isNone)
            ).length
        }

        const countFixed = (edge: O.Option<Side>[], pos: number, turn: Side, prev: Side, lastCaptured: Side, prevPieceIsCaptured: boolean) : number => { 
            // 確定条件
            //（確定石）→（同色石） このとき同色石は確定する
            //（確定石）→（不明）→（確定石）と並んでいれば、不明は確定石と定まる
            //（確定石）→（不明X）→ (不明色A)→（不明色B: B!=A）→(不明:空白1つ)  空白にA,Bどちらの色が置かれても、不明Xは確定石同士で挟まれる 
            
            // 返り値について
            // 以降(pos+1～)不明なら、負の値を返す。確定石ならば、edge[pos～LEN-1]上のturn色の確定石の数を返す.
            if (pos == edge.length - 1) {
                return ( 
                    F.pipe(
                        edge[pos],
                        O.match(
                            () => -1,
                            (side) => side === turn ? 1 : 0
                        )
                    ) 
                )
            } 
            return ( 
                F.pipe (
                    edge[pos],
                    O.match(
                        //空白
                        () => -1, 
                        //（直前）→(現在)→（次）
                        (side) => {
                            if (prevPieceIsCaptured) {
                                const count =
                                    countFixed(edge, pos + 1, turn, side, (lastCaptured === side) ? lastCaptured : side, (lastCaptured === side)  )
                                if (count >= 0) //（確定）→(確定)→（確定）
                                    return (turn === side) ? count + 1 : count
                                else //（確定）→(確定)→（確定:確定石の同色連続である場合,edge[pos]は確定  or 不確定）
                                    return (prev === side) ? (turn === side) ? 1 : 0 : -1 
                            }
                            else {
                                const count = countFixed (edge, pos + 1, turn, side, lastCaptured, false)
                                if (count >= 0) //（不明）→（不明）→（確定）
                                    return (turn === side) ? count + 1 : count
                                else //（不明）→（確定:残り空白１&&現在直前の石と別色  or  不確定）  反転可能性があるのはedge[pos]だけ => 直前の石にとってedge[pos]は確定石
                                    return (countEmpty(edge) === 1 && prev !== side) ? 0 : -1
                            }
                        }
                    )
                )  
            )
        }
        
        return ( 
            F.pipe (
                edge[0],  // 開始点(隅)が不明
                O.match(
                    () => 0,
                    (side) => {
                        if (side === turn) 
                            return 1 + Math.max(0, countFixed(edge, 1, turn, side, side, true))
                        else 
                            return Math.max(0, countFixed(edge, 1, turn, side, side, true))
                    }
                )
            ) 

        )
    }

    //確定石(四隅から連続する、以降反転しない石)の数え上げ
    const boardFixed = (board: Board) => {
        let black = 0
        let white = 0
        const LEN = 8
        const edges = F.pipe ( 
            Array(8).fill([]),
            A.map((_) => Array(8).fill(O.none)),
        )
        for (let i = 0; i < 8; i++) { 
            edges[0][i] = board[0][i]
            edges[1][i] = board[0][LEN - i - 1]
            edges[2][i] = board[LEN - 1][i]
            edges[3][i] = board[LEN - 1][LEN - i - 1]
            edges[4][i] = board[i][0]
            edges[5][i] = board[LEN - i - 1][0]
            edges[6][i] = board[i][LEN - 1]
            edges[7][i] = board[LEN - i - 1][LEN - 1]
        }
        
        for (let i = 0; i < 8; i += 2) {
            const b_h = edgeFixed(edges[i], 'X');
            const b_t = edgeFixed(edges[i + 1], 'X');
            if (b_h === b_t) 
                black += b_h;
            else
                black += b_h + b_t;

            const w_h = edgeFixed(edges[i], 'O');
            const w_t = edgeFixed(edges[i + 1], 'O');
            if (w_h === w_t) 
                white += w_h;
            else
                white += w_h + w_t;
        }

        // 重複削除
        black -= 
            F.pipe(
                [
                    [0, 0], [0, 7], [7, 0], [7, 7],
                ], 
                A.map (([x, y]) => board[x][y]),
                A.filter((b) => O.isSome (b) && b.value === 'X'),
            ).length

        
        white -= 
            F.pipe(
                [
                    [0, 0], [0, 7], [7, 0], [7, 7],
                ], 
                A.map (([x, y]) => board[x][y]),
                A.filter((b) => O.isSome (b) && b.value === 'O'),
            ).length 
        return [black, white]
    }

    const w_fixed = 100.
    const w_oppend= 
        [28, 20, 62,104, 26,102, 27,102, 77, 93, 15, 76, 70, 11,103,101, 16, 92, 42,  0,  6, 98,  5, 76,101, 66, 33, 95, 46, 57, 71, 65, 65, 57, 51, 43, 99, 60,  0,103,104,  8, 79, 19, 76, 39, 23, 24, 80, 18,  1, 81, 89, 15,105, 70, 40, 43,108, 95,  0,105, 11, 36,]
    
    export const evaluateBoard = (turn: Side) => (board: Board) => {
        const [black, white] = boardFixed(board)
        const n = Board.count(board)
        return ( 
            w_fixed * (turn === 'X' ? 1 : -1) * (black - white) 
            + w_oppend[n] * Board.getSelectableSpace (turn) (board).length  
        )
    } 

    export const minimax =
        (evaluate : (board: Board) => number) =>
        (isMaximizing: boolean) =>  
        (depth: number) => 
        (turn: Side) => 
        (board: Board) : [O.Option<[number, number]>, number] => {

        if (depth === 0 || O.isSome(Board.isFinished(board))) { 
            return [O.none, evaluate (board)]
        }
        return (
            F.pipe(
                board,
                Board.getSelectableSpace (turn),  
                A.map<[number, number], O.Option<[O.Option<[number, number]>, number]>>(([x,y]) =>  
                    F.pipe( 
                        board,
                        Board.trySet(x,y)(turn) ,
                        O.match(
                            () => O.none, 
                            F.flow(
                                minimax (evaluate) (!isMaximizing) (depth - 1) (turn === 'O' ? 'X' : 'O'),
                                ([_, score]) => O.some([O.some([x,y]), score])
                            ) 
                        ) 
                    )  
                ),  
                A.filter(O.isSome),
                A.map((a) => a.value),
                A.reduce<[O.Option<[number, number]>, number], [O.Option<[number, number]>, number]>(
                    [O.none, isMaximizing ? -Infinity : Infinity],
                    ([accI, acc], [xi, x]) => (
                        isMaximizing 
                            ? acc < x ? [xi, x] : [accI, acc] 
                            : x < acc ? [xi, x] : [accI, acc]
                    )
                ) 
            ) 
        ) 
    }

    export const alphabeta =
        (evaluate : (board: Board) => number) =>
        (isMaximizing: boolean) =>  
        (alpha: number, beta: number) =>
        (depth: number) => 
        (turn: Side) => 
        (board: Board) : [O.Option<[number, number]>, number] => { 
        if (depth === 0 || O.isSome(Board.isFinished(board))) { 
            return [O.none, evaluate (board)]
        }
        else { 
            if (isMaximizing) {
                let ax = alpha  
                let sel : O.Option<[number, number]> = O.none
                for (const [x,y] of Board.getSelectableSpace(turn)(board)) {
                    const nextBoard = Board.trySet(x,y)(turn)(board) 
                    if (O.isSome(nextBoard)) { 
                        const [_, a] = alphabeta (evaluate) (!isMaximizing) (ax, beta) (depth - 1) (turn === 'O' ? 'X' : 'O') (nextBoard.value)
                        if (ax < a) { 
                            ax = a
                            sel = O.some([x,y])
                        }
                        if (ax >= beta) break
                    }
                }
                return [sel, ax] 
            }
            else {
                let bx = beta
                let sel : O.Option<[number, number]> = O.none
                for (const [x,y] of Board.getSelectableSpace (turn)(board)) {
                    const nextBoard = Board.trySet(x,y)(turn)(board) 
                    if (O.isSome(nextBoard)) { 
                        const [_, b] = alphabeta (evaluate) (!isMaximizing) (alpha, bx) (depth - 1) (turn === 'O' ? 'X' : 'O') (nextBoard.value)
                        bx = Math.min(bx, b) 
                        if (b < bx) { 
                            bx = b
                            sel = O.some([x,y])
                        }
                        if (alpha >= bx) break
                    }
                }
                return [sel, bx]
            }
        } 
    }

    export const random = (turn: Side) => (board: Board) => { 
        const candidates = Board.getSelectableSpace (turn) (board) 
        return ( 
            (candidates.length > 0)
            ? O.some (candidates[Math.floor(Math.random() * candidates.length)])
            : O.none 
        )
    }

} 

type GameState = { 
    board: Board
    status: GameStatus
    turn: Side
    winner: O.Option<Side>
} 
 

export default (XisCPU : boolean, OisCPU : boolean): {
    state: GameState
    handleClick: (index: number) => void
    handleInit: () => void
    handlePass: () => void
} => { 

    const initGameState : GameState = {
        board: Board.init() ,
        status: 'playing',
        turn: 'X',
        winner: O.none
    }
    
    const [state, setState] = useState<GameState>(initGameState)  

    const pass = () => {  
        setState ( 
            {
                board: state.board,
                turn: state.turn == 'X' ? 'O' : 'X',  
                status: 'playing',
                winner: O.none
            }
        )
    }
 
    const place = (x: number, y: number) => {  
        F.pipe (
            Board.trySet (x,y) (state.turn) (state.board),
            O.match(
                () => {},
                (nextBoard) => {
                    F.pipe(
                        nextBoard,         
                        Board.isFinished,
                        O.match<O.Option<Side>, GameState>(
                            () => (
                                {
                                    board: nextBoard,
                                    turn: state.turn == 'X' ? 'O' : 'X',
                                    status: 'playing',
                                    winner: O.none
                                }
                            ) , 
                            (result) => (
                                {
                                    board: nextBoard,
                                    turn: state.turn == 'X' ? 'O' : 'X',
                                    status: 'finished',
                                    winner: result
                                }
                            ) 
                        ),
                        setState  
                    )
                }
            ) 
        )   
    }  
    
    useEffect(() => {     
        if (state.status === 'playing' 
            && ((state.turn == 'X' && XisCPU) || (state.turn == 'O' && OisCPU))) {   

            const n = Board.count (state.board)  
            F.pipe(
                (
                    n <= 15   ? CPU.alphabeta (CPU.evaluateBoard (state.turn)) (true) (-Infinity, Infinity) (6) (state.turn) (state.board) 
                    : n <= 64 - 12 ? CPU.alphabeta (CPU.evaluateBoard (state.turn)) (true) (-Infinity, Infinity) (6) (state.turn) (state.board) 
                    : CPU.alphabeta (
                        (board) =>  
                            (state.turn === 'X') 
                                ? Board.score ('X') (board) - Board.score ('O') (board) 
                                : Board.score ('O') (board) - Board.score ('X') (board) 
                        ) (true) (-Infinity, Infinity) (12) (state.turn) (state.board)  
                ),
                ([move, _]) => move,
                O.match(
                    () => {pass()},
                    ([x,y]) => { 
                        place(x,y)  
                    }
                ) 
            ) 

            // F.pipe(
            //     CPU.random (state.turn) (state.board),
            //     O.match(
            //         () => {},
            //         ([x,y]) => updateState(x,y)
            //     ) 
            // )
            
        }
    }, [state])
  
    const handleClick = (n: number) : void => { 
        const y = n/8|0
        const x = n%8 
        if ( O.isNone(state.board[y][x]) 
            && state.status == 'playing'
            && ((state.turn == 'X' && !XisCPU) || (state.turn == 'O' && !OisCPU)) ) {

            place(x, y) 
        }
    }
 
    const handleInit = () : void => { 
        setState(initGameState)
    }

    const handlePass = () : void => {  
        if (state.status === 'playing' 
            && !((state.turn == 'X' && XisCPU) || (state.turn == 'O' && OisCPU)))  
            pass() 
    }

    return { state, handleClick, handleInit, handlePass };
}