import { NoteBox } from '../common/NoteBox'

export const CustomMainnetChainWarning = () => {
  return (
    <NoteBox variant="warning" className="mt-2">
      <div className="flex flex-col space-y-2 text-sm">
        <p>
          You are attempting to transfer funds to a custom <b>Mainnet</b> chain.
        </p>

        <p>Only proceed if you fully trust this network.</p>
      </div>
      <div className="mt-2 flex flex-col text-sm">
        <p>
          <b>WARNING:</b> If someone instructed you to add this chain,{' '}
          <b>DO NOT CONTINUE</b>.
        </p>

        <p>
          This is a common tactic used in scams, and you are at high risk of
          permanently losing your funds.
        </p>
      </div>
    </NoteBox>
  )
}
