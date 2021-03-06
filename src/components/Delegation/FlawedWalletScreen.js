// @flow

import React from 'react'
import {View, ScrollView, Image} from 'react-native'
import {injectIntl, defineMessages, intlShape} from 'react-intl'

import {Text, Button} from '../UiKit'

import styles from './styles/FlawedWalletScreen.style'
import image from '../../assets/img/mnemonic_explanation.png'

import type {ComponentType} from 'react'

const messages = defineMessages({
  title: {
    id: 'components.txhistory.flawedwalletmodal.title',
    defaultMessage: '!!!WARNING',
  },
  explanation1: {
    id: 'components.txhistory.flawedwalletmodal.explanation1',
    defaultMessage:
      '!!!It looks like you have accidentally created or restored a wallet ' +
      'that is only included in special versions for development. ' +
      'As a security mesure, we have disabled this wallet.',
  },
  explanation2: {
    id: 'components.txhistory.flawedwalletmodal.explanation2',
    defaultMessage:
      '!!!You still can create a new wallet or restore one without restrictions. ' +
      'If you were affected in some way by this issue, please contact Emurgo.',
  },
  okButton: {
    id: 'components.txhistory.flawedwalletmodal.okButton',
    defaultMessage: '!!!I understand',
  },
})

type Props = {
  intl: intlShape,
  visible: boolean,
  onPress: () => any,
  onRequestClose: () => any,
  disableButtons: boolean,
}

const FlawedWalletScreen = ({
  intl,
  onPress,
  onRequestClose,
  disableButtons,
}: Props) => {
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>{intl.formatMessage(messages.title)}</Text>
          <Image source={image} />
        </View>
        <Text style={styles.paragraph}>
          {intl.formatMessage(messages.explanation1)}
        </Text>
        <Text style={styles.paragraph}>
          {intl.formatMessage(messages.explanation2)}
        </Text>
      </View>
      <View style={styles.buttons}>
        <Button
          block
          outlineShelley
          onPress={onPress}
          title={intl.formatMessage(messages.okButton)}
          style={styles.button}
          disabled={disableButtons}
        />
      </View>
    </ScrollView>
  )
}

export default injectIntl((FlawedWalletScreen: ComponentType<Props>))
