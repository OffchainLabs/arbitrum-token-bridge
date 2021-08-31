import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import Alert from 'react-bootstrap/Alert'
import networks from './networks'
import explorer from 'media/gifs/explorer.gif'

const CopyLink = ({ url, msg }: { url: string; msg: string }) => {
  const onClick = (e: any) => {
    e.preventDefault()
    copyTextToClipboard(url)
    alert(msg)
  }
  return (
    <a href="" onClick={onClick}>
      {url}
    </a>
  )
}

export default () => {
  const netWork = networks[4]

  const arbnetwork = networks[netWork.partnerChainID]

  const l1NetworkName = netWork.name
  const l2NetworkName = arbnetwork.name

  return (
    <Container>
      <h3> Disclaimer of Warranties; Assumption of Risk</h3>

      <p>
        YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK. THE SERVICE IS PROVIDED ON
        AN “AS IS” AND “AS AVAILABLE” BASIS. OFFCHAIN LABS, INC.,ITS AFFILIATES,
        AND ITS AND THEIR RESPECTIVE OFFICERS, EMPLOYEES, DIRECTORS, SERVICES
        PROVIDERS, LICENSORS AND AGENTS (COLLECTIVELY, THE “OFFCHAIN LABS
        PARTIES”) EXPRESSLY DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER
        EXPRESS, IMPLIED OR STATUTORY, INCLUDING THE IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
        NON-INFRINGEMENT.
      </p>

      <p>
        THE OFFCHAIN LABS PARTIES MAKE NO WARRANTY THAT (A) THE SERVICE WILL
        MEET YOUR REQUIREMENTS; (B) THE SERVICE WILL BE UNINTERRUPTED, TIMELY,
        SECURE, OR ERROR-FREE; (C) THE RESULTS THAT MAY BE OBTAINED FROM THE USE
        OF THE SERVICE WILL BE ACCURATE OR RELIABLE; OR (D) THE QUALITY OF ANY
        PRODUCTS, SERVICES, APPLICATIONS, INFORMATION, OR OTHER MATERIAL
        PURCHASED OR OBTAINED BY YOU THROUGH THE SERVICE WILL MEET YOUR
        EXPECTATIONS.
      </p>

      <p>
        BY ACCESSING AND USING THE SERVICE, YOU REPRESENT AND WARRANT THAT YOU
        UNDERSTAND THE INHERENT RISKS ASSOCIATED WITH USING CRYPTOGRAPHIC AND
        BLOCKCHAIN-BASED SYSTEMS, AND THAT YOU HAVE A WORKING KNOWLEDGE OF THE
        USAGE AND INTRICACIES OF DIGITAL ASSETS, SUCH AS THOSE FOLLOWING THE
        ETHEREUM TOKEN STANDARD (ERC-20) AND BRIDGING ACROSS DIFFERENT
        BLOCKCHAIN SOLUTIONS. YOU FURTHER UNDERSTAND THAT THE MARKETS FOR THESE
        DIGITAL ASSETS ARE HIGHLY VOLATILE DUE TO VARIOUS FACTORS, INCLUDING
        ADOPTION, SPECULATION, TECHNOLOGY, SECURITY, AND REGULATION. YOU
        ACKNOWLEDGE AND ACCEPT THAT THE COST AND SPEED OF TRANSACTING WITH
        CRYPTOGRAPHIC AND BLOCKCHAIN-BASED SYSTEMS SUCH AS ETHEREUM AND ARBITRUM
        ARE VARIABLE AND MAY INCREASE DRAMATICALLY AT ANY TIME. YOU FURTHER
        ACKNOWLEDGE AND ACCEPT THE RISK THAT YOUR DIGITAL ASSETS MAY LOSE SOME
        OR ALL OF THEIR VALUE WHILE THEY ARE SUPPLIED TO THE PROTOCOL THROUGH
        THE INTERFACE, YOU MAY SUFFER LOSS DUE TO THE FLUCTUATION OF PRICES OF
        TOKENS IN A TRADING PAIR OR LIQUIDITY POOL, AND, ESPECIALLY IN EXPERT
        MODES, EXPERIENCE SIGNIFICANT PRICE SLIPPAGE AND COST. YOU UNDERSTAND
        THAT ANYONE CAN CREATE A TOKEN, INCLUDING FAKE VERSIONS OF EXISTING
        TOKENS AND TOKENS THAT FALSELY CLAIM TO REPRESENT PROJECTS, AND
        ACKNOWLEDGE AND ACCEPT THE RISK THAT YOU MAY MISTAKENLY TRADE THOSE OR
        OTHER TOKENS. YOU FURTHER ACKNOWLEDGE THAT WE ARE NOT RESPONSIBLE FOR
        ANY OF THESE VARIABLES OR RISKS, AND CANNOT BE HELD LIABLE FOR ANY
        RESULTING LOSSES THAT YOU EXPERIENCE WHILE ACCESSING OR USING THE
        SERVICE. ACCORDINGLY, YOU UNDERSTAND AND AGREE TO ASSUME FULL
        RESPONSIBILITY FOR ALL OF THE RISKS OF ACCESSING AND USING THE SERVICE,
        INCLUDING THE BRIDGE INTERFACE TO INTERACT WITH THE PROTOCOL.
      </p>

      <h3> Limitation of Liability </h3>

      <p>
        YOU EXPRESSLY UNDERSTAND AND AGREE THAT THE OFFCHAIN LABS PARTIES WILL
        NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        EXEMPLARY DAMAGES, OR DAMAGES FOR LOSS OF PROFITS INCLUDING DAMAGES FOR
        LOSS OF GOODWILL, USE, OR DATA OR OTHER INTANGIBLE LOSSES (EVEN IF THE
        OFFCHAIN LABS PARTIES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
        DAMAGES), WHETHER BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY,
        OR OTHERWISE, RESULTING FROM: (A) THE USE OR THE INABILITY TO USE THE
        SERVICE; (B) THE COST OF PROCUREMENT OF SUBSTITUTE GOODS AND SERVICES
        RESULTING FROM ANY GOODS, DATA, INFORMATION, OR SERVICES PURCHASED OR
        OBTAINED OR MESSAGES RECEIVED OR TRANSACTIONS ENTERED INTO THROUGH OR
        FROM THE SERVICE; (C) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR
        TRANSMISSIONS OR DATA; (D) STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON
        THE SERVICE; (E) INTERRUPTION OR CESSATION OF FUNCTION RELATED TO THE
        INTERFACE; (F) BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE THAT MAY BE
        TRANSMITTED TO OR THROUGH THE INTERFACE; (G) ERRORS OR OMISSIONS IN, OR
        LOSS OR DAMAGE INCURRED AS A RESULT OF THE USE OF, ANY CONTENT MADE
        AVAILABLE THROUGH THE INTERFACE; OR (H) ANY OTHER MATTER RELATING TO THE
        SERVICE. IN NO EVENT WILL THE OFFCHAIN LABS PARTIES’ TOTAL LIABILITY TO
        YOU FOR ALL DAMAGES, LOSSES, OR CAUSES OF ACTION EXCEED THE AMOUNT YOU
        HAVE PAID OFFCHAIN LABS IN THE LAST SIX (6) MONTHS, OR, IF GREATER, ONE
        HUNDRED DOLLARS ($100).{' '}
      </p>

      <p></p>

      <p>
        SOME JURISDICTIONS DO NOT ALLOW THE DISCLAIMER OR EXCLUSION OF CERTAIN
        WARRANTIES OR THE LIMITATION OR EXCLUSION OF LIABILITY FOR INCIDENTAL OR
        CONSEQUENTIAL DAMAGES. ACCORDINGLY, SOME OF THE ABOVE LIMITATIONS SET
        FORTH ABOVE MAY NOT APPLY TO YOU OR BE ENFORCEABLE WITH RESPECT TO YOU.
        IF YOU ARE DISSATISFIED WITH ANY PORTION OF THE SERVICE OR WITH THESE
        TERMS OF SERVICE, YOUR SOLE AND EXCLUSIVE REMEDY IS TO DISCONTINUE USE
        OF THE SERVICE.{' '}
      </p>
      <p>
        IF YOU ARE A USER FROM NEW JERSEY, THE FOREGOING SECTIONS TITLED
        “DISCLAIMER OF WARRANTIES; ASSUMPTION OF RISK” AND “LIMITATION OF
        LIABILITY” ARE INTENDED TO BE ONLY AS BROAD AS IS PERMITTED UNDER THE
        LAWS OF THE STATE OF NEW JERSEY. IF ANY PORTION OF THESE SECTIONS IS
        HELD TO BE INVALID UNDER THE LAWS OF THE STATE OF NEW JERSEY, THE
        INVALIDITY OF SUCH PORTION WILL NOT AFFECT THE VALIDITY OF THE REMAINING
        PORTIONS OF THE APPLICABLE SECTIONS.
      </p>

      <h3> Indemnification and Release</h3>
      <p>
        You agree to defend, indemnify, and hold harmless the Offchain Labs
        Parties from any and all losses, damages, expenses, including reasonable
        attorneys’ fees, rights, claims, actions of any kind, and injury
        (including death) arising out of or relating to your use of the Service,
        Your Apps, any User Content, your connection to the Service, your
        violation of these Terms of Service, or your violation of any rights of
        another. Offchain Labs will provide notice to you of any such claim,
        suit, or proceeding. Offchain Labs reserves the right to assume the
        exclusive defense and control of any matter which is subject to
        indemnification under this section, and you agree to cooperate with any
        reasonable requests assisting Offchain Labs’ defense of such matter. You
        may not settle or compromise any claim against the Offchain Labs Parties
        without Offchain Labs’ written consent.{' '}
      </p>
      <p>
        You expressly agree that you assume all risks in connection with your
        access and use of the Service, including your interaction with the
        Protocol. You further expressly waive and release us from any and all
        liability, claims, causes of action, or damages arising from or in any
        way relating to your use of the Service, including your interaction with
        the Protocol. If you are a California resident, you waive California
        Civil Code Section 1542, which says: “A general release does not extend
        to claims that the creditor or releasing party does not know or suspect
        to exist in his or her favor at the time of executing the release and
        that, if known by him or her, would have materially affected his or her
        settlement with the debtor or releasing party.” If you are a resident of
        another jurisdiction, you waive any comparable statute or doctrine.
      </p>
    </Container>
  )
}

const styles = {
  gifStyle: { maxWidth: 160, border: '1px solid black' },
  textStyle: { fontSize: '10px' },
  headerStyle: {
    fontSize: '12px',
    fontWeight: 500,
    minHeight: 30,
    marginBottom: 10,
    marginTop: 10
  },
  upperSecton: { minHeight: 120, justifyContent: 'center' }
}

const copyTextToClipboard = (str: string) => {
  const el = document.createElement('textarea')
  el.value = str
  el.setAttribute('readonly', '')
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}
