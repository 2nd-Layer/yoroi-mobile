// @flow

import React from 'react'
import {compose} from 'redux'
import {connect} from 'react-redux'
import {View, TouchableHighlight} from 'react-native'
import {withHandlers} from 'recompose'

import {SEND_ROUTES} from '../../RoutesList'
import CustomText from '../CustomText'

import {COLORS} from '../../styles/config'
import styles from './styles/SendScreen.style'

import type {SubTranslation} from '../../l10n/typeHelpers'

const getTrans = (state) => state.trans.SendScreen

type Props = {
  navigateToConfirm: () => mixed,
  trans: SubTranslation<typeof getTrans>,
}

const SendScreen = ({navigateToConfirm, trans}: Props) => (
  <View style={styles.container}>
    <CustomText style={styles.welcome}>
    i18nSend all your ADA here
    </CustomText>

    <TouchableHighlight
      style={styles.button}
      activeOpacity={0.9}
      underlayColor={COLORS.WHITE}
      onPress={navigateToConfirm}
    >
      <View style={styles.continueButton}>
        <CustomText style={styles.continueButtonText}>{trans.continue}</CustomText>
      </View>
    </TouchableHighlight>
  </View>
)


export default compose(
  connect((state) => ({
    trans: getTrans(state),
  })),
  withHandlers({
    navigateToConfirm: ({navigation}) => (event) => navigation.navigate(SEND_ROUTES.CONFIRM),
  })
)(SendScreen)

