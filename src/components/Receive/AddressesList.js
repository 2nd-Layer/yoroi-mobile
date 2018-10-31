// @flow

import React from 'react'
import {connect} from 'react-redux'
import {compose} from 'redux'
import {withState, withHandlers} from 'recompose'
import {View, TouchableHighlight} from 'react-native'

import {Text} from '../UiKit'
import AddressView from './AddressView'

import styles from './styles/AddressesList.style'

import type {SubTranslation} from '../../l10n/typeHelpers'

const getTranslations = (state) => state.trans.AddressesList

type Props = {
  addresses: Array<{address: string, isUsed: boolean}>,
  showAll: boolean,
  setShowAll: (boolean) => void,
  onShowPress: () => void,
  translations: SubTranslation<typeof getTranslations>,
}

const AddressesList = ({
  addresses,
  showAll,
  setShowAll,
  onShowPress,
  translations,
}: Props) => {
  const shownAddresses = showAll
    ? [...addresses] // because reverse below is mutating
    : addresses.filter((x) => !x.isUsed)
  // We want newest first
  shownAddresses.reverse()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{translations.walletAddresses}</Text>
        <TouchableHighlight onPress={onShowPress}>
          <Text style={styles.clickableLabel}>
            {showAll
              ? translations.hideUsedAddresses
              : translations.showUsedAddresses}
          </Text>
        </TouchableHighlight>
      </View>
      {shownAddresses.map(({address, isUsed}) => (
        <View key={address} style={styles.addressContainer}>
          <AddressView address={address} isUsed={isUsed} />
        </View>
      ))}
    </View>
  )
}

export default compose(
  connect((state) => ({
    translations: getTranslations(state),
  })),
  withState('showAll', 'setShowAll', true),
  withHandlers({
    onShowPress: ({showAll, setShowAll}) => () => setShowAll(!showAll),
  }),
)(AddressesList)
