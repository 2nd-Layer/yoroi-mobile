// @flow
import React from 'react'
import {compose} from 'redux'
import {withState, withHandlers} from 'recompose'
import {ScrollView, StyleSheet, Switch} from 'react-native'
import {connect} from 'react-redux'

import {walletNameSelector} from '../../selectors'
import {SETTINGS_ROUTES} from '../../RoutesList'
import {withNavigationTitle, withTranslations} from '../../utils/renderUtils'
import {
  SettingsItem,
  NavigatedSettingsItem,
  SettingsSection,
} from './SettingsItems'

import type {SubTranslation} from '../../l10n/typeHelpers'

const getTranslations = (state) => state.trans.SettingsScreen

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#fff',
  },
})

type Props = {
  walletName: string,
  isEasyConfirmation: boolean,
  onToggleEasyConfirmation: () => void,
  translations: SubTranslation<typeof getTranslations>,
}

const WalletSettingsScreen = ({
  isEasyConfirmation,
  onToggleEasyConfirmation,
  translations,
  walletName,
}: Props) => (
  <ScrollView style={styles.scrollView}>
    <SettingsSection title={translations.walletName}>
      <NavigatedSettingsItem
        label={walletName}
        navigateTo={SETTINGS_ROUTES.CHANGE_WALLET_NAME}
      />
    </SettingsSection>

    <SettingsSection title={translations.privacy}>
      <NavigatedSettingsItem
        label={translations.changePassword}
        navigateTo={SETTINGS_ROUTES.CHANGE_WALLET_NAME}
      />

      <SettingsItem label={translations.easyConfirmation}>
        <Switch
          value={isEasyConfirmation}
          onValueChange={onToggleEasyConfirmation}
        />
      </SettingsItem>
    </SettingsSection>

    <SettingsSection>
      <NavigatedSettingsItem
        label={translations.removeWallet}
        navigateTo={SETTINGS_ROUTES.REMOVE_WALLET}
      />
    </SettingsSection>
  </ScrollView>
)

export default compose(
  withTranslations(getTranslations),
  withNavigationTitle(({translations}) => translations.title),
  connect((state) => ({
    walletName: walletNameSelector(state),
  })),

  withState('isEasyConfirmation', 'setEasyConfirmation', false),
  withHandlers({
    onToggleEasyConfirmation: ({
      isEasyConfirmation,
      setEasyConfirmation,
    }) => () => setEasyConfirmation(!isEasyConfirmation),
  }),
)(WalletSettingsScreen)