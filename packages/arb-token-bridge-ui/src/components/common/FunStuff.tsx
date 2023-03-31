import { useState } from 'react'

export function FunStuff() {
  const numberOfFunStuff = Math.ceil(Math.random() * 4) + 4

  const funStuffLeft = () => {
    return {
      left: 0,
      top: `${Math.floor(Math.random() * 90)}vh`,
      transform: 'rotate(90deg)'
    }
  }

  const funStuffRight = () => {
    return {
      right: 0,
      top: `${Math.floor(Math.random() * 90)}vh`,
      transform: 'rotate(-90deg)'
    }
  }

  const funStuffTop = () => {
    return {
      left: `${Math.floor(Math.random() * 90)}vw`,
      top: 0,
      transform: 'rotate(-180deg)'
    }
  }

  const funStuffBottom = () => {
    return {
      left: `${Math.floor(Math.random() * 90)}vw`,
      bottom: 0
    }
  }

  const funStuffPosition = (index: number) => {
    switch (index) {
      case 0:
        return funStuffLeft()
      case 1:
        return funStuffRight()
      case 2:
        return funStuffTop()
      default:
        return funStuffBottom()
    }
  }

  const removeFunStuff = (index: number) => {
    const newFunStuff = [...funStuff]
    const shouldAdd = Math.random() > (funStuff.length === 1 ? 0.1 : 0.4)
    if (shouldAdd) {
      const posIndex = Math.floor(Math.random() * 4)
      newFunStuff.push(funStuffPosition(posIndex))
    }
    newFunStuff.splice(index, 1)
    setFunStuff(newFunStuff)
  }

  const [funStuff, setFunStuff] = useState(
    [...new Array(numberOfFunStuff)].map(_ =>
      funStuffPosition(Math.floor(Math.random() * 4))
    )
  )

  return (
    <>
      {funStuff.map((pos, index) => {
        return (
          <button
            key={index}
            style={pos}
            className="arbitrum-classic-funStuff"
            onClick={() => removeFunStuff(index)}
          ></button>
        )
      })}
    </>
  )
}
