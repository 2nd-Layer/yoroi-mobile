// @flow
import React from 'react'
import {View, WebView} from 'react-native'
// import {compose} from 'recompose'
import {compose} from 'redux'
import {withHandlers} from 'recompose'
import {injectIntl, defineMessages} from 'react-intl'
import type {IntlShape} from 'react-intl'
import type {ComponentType} from 'react'

import {STAKING_CENTER_ROUTES} from '../../RoutesList'
import {withNavigationTitle} from '../../utils/renderUtils'
import {CARDANO_CONFIG} from '../../config'
import type {Navigation} from '../../types/navigation'
import {Logger} from '../../utils/logging'
import {ignoreConcurrentAsyncHandler} from '../../utils/utils'
import walletManager from '../../crypto/wallet'
import {getShelleyTxFee} from '../../crypto/shelley/transactions/utils'
import {InsufficientFunds} from '../../crypto/errors'
import {errorMessages} from '../../i18n/global-messages'
import {handleGeneralError, showErrorDialog} from '../../actions'

import styles from './styles/DelegationCenter.style'

const messages = defineMessages({
  title: {
    id: 'components.stakingcenter.title',
    defaultMessage: '!!!Staking Center',
  },
  delegationTxBuildError: {
    id: 'components.stakingcenter.delegationTxBuildError',
    defaultMessage: '!!!Error while building delegation transaction',
  },
})

/**
 * Prepares WebView's target staking URI
 * @param {*} userAda : needs to be in ADA (not Lovelaces) as per Seiza API
 * @param {*} poolList : Array of delegated pool hash
 */
const prepareStakingURL = (
  userAda: string,
  poolList: Array<string>,
): null | string => {
  // eslint-disable-next-line max-len
  // Refer: https://github.com/Emurgo/yoroi-frontend/blob/2f06f7afa5283365f1070b6a042bcfedba51646f/app/containers/wallet/staking/StakingPage.js#L60
  // source=mobile is constant and already included
  // TODO: add locale parameter
  let finalURL = CARDANO_CONFIG.SHELLEY.SEIZA_STAKING_SIMPLE(userAda)
  if (poolList != null) {
    finalURL += `&delegated=${encodeURIComponent(JSON.stringify(poolList))}`
  }
  return finalURL
}

const DelegationCenter = ({navigation, intl, handleOnMessage}) => {
  const approxAdaToDelegate = navigation.getParam('approxAdaToDelegate')
  const poolList = navigation.getParam('pools')
  return (
    <View style={styles.container}>
      <WebView
        useWebKit
        source={{uri: prepareStakingURL(approxAdaToDelegate, poolList)}}
        onMessage={(event) => handleOnMessage(event, intl)}
      />
    </View>
  )
}

type SelectedPool = {|
  +name: null | string,
  +poolHash: string,
|}

type ExternalProps = {|
  navigation: Navigation,
  intl: IntlShape,
|}

export default injectIntl(
  (compose(
    withNavigationTitle(({intl}) => intl.formatMessage(messages.title)),
    withHandlers({
      handleOnMessage: ignoreConcurrentAsyncHandler(
        ({navigation}) => async (event, intl) => {
          try {
            const pools: Array<SelectedPool> = JSON.parse(
              decodeURI(event.nativeEvent.data),
            )
            const utxos = navigation.getParam('utxos')
            const valueInAccount = navigation.getParam('valueInAccount')
            Logger.debug(`From Seiza: ${JSON.stringify(pools)}`)

            if (pools && pools.length >= 1) {
              const delegationTxData = await walletManager.prepareDelegationTx(
                {id: pools[0].poolHash},
                valueInAccount.toNumber(),
                utxos,
              )
              const fee = await getShelleyTxFee(delegationTxData.unsignedTx.IOs)
              navigation.navigate(STAKING_CENTER_ROUTES.DELEGATION_CONFIRM, {
                poolName: pools[0].name,
                poolHash: pools[0].poolHash,
                amountToDelegate: delegationTxData.totalAmountToDelegate,
                transactionFee: fee,
                delegationTxData,
              })
            } else {
              throw new Error('invalid pool data')
            }
          } catch (e) {
            if (e instanceof InsufficientFunds) {
              await showErrorDialog(errorMessages.insufficientBalance, intl)
            } else {
              await handleGeneralError(
                messages.delegationTxBuildError,
                e.message,
                intl,
              )
            }
          }
        },
      ),
    }),
  )(DelegationCenter): ComponentType<ExternalProps>),
)