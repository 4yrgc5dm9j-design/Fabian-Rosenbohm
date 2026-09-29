import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Card, Chip, inputStyle, Label } from '@/components/ui';
import { validateAccount } from '@/lib/auth';
import { confirm, notify } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type Mode = 'login' | 'register';

export default function SignInScreen() {
  const theme = useTheme();
  const store = useStore();
  const { members, hasAccounts } = store;

  // Konten können nur für Personen angelegt werden, die im Haushalt schon
  // existieren (von einem angemeldeten Mitglied hinzugefügt) – oder für die
  // allererste Person, solange es noch gar kein Konto gibt.
  const open = members.filter((m) => !m.account);
  const canRegister = open.length > 0;

  const [mode, setMode] = useState<Mode>(hasAccounts ? 'login' : 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [memberId, setMemberId] = useState<string | null>(open[0]?.id ?? null);
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = members.find((m) => m.id === memberId);
  useEffect(() => {
    // „Ich“ ist nur ein Platzhalter, echte Namen übernehmen.
    setName(chosen && chosen.name !== 'Ich' ? chosen.name : '');
  }, [chosen]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword('');
    setRepeat('');
  }

  async function submit() {
    setError(null);
    if (mode === 'login') {
      if (!username.trim() || !password) return setError('Bitte Benutzername und Passwort eingeben.');
      setBusy(true);
      const ok = await store.signIn(username, password, remember);
      setBusy(false);
      if (!ok) setError('Benutzername oder Passwort ist falsch.');
      return;
    }
    if (!name.trim()) return setError('Bitte deinen Namen eingeben.');
    const problem = validateAccount(username, password, repeat, members, memberId ?? undefined);
    if (problem) return setError(problem);
    setBusy(true);
    await store.register({ memberId, name: name.trim(), username, password, remember });
    setBusy(false);
  }

  async function forgot() {
    const others = members.filter((m) => m.account).length > 1;
    if (others) {
      notify(
        'Passwort vergessen?',
        'Eine andere Person aus deinem Haushalt kann sich anmelden und unter „Haushalt → Personen“ dein Konto zurücksetzen. Danach kannst du hier ein neues Passwort festlegen.',
      );
      return;
    }
    const ok = await confirm(
      'Passwort vergessen?',
      'Da es nur ein Konto gibt, kann es nicht zurückgesetzt werden. Du kannst die App komplett zurücksetzen – dabei werden ALLE Daten auf diesem Gerät gelöscht.',
      'Alles löschen',
    );
    if (ok) store.resetAll();
  }

  const title = mode === 'login' ? 'Anmelden' : hasAccounts ? 'Konto einrichten' : 'Willkommen!';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: theme.tint }]}>
            <Text style={styles.logoText}>€</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Haushaltsbuch</Text>
          <Text style={{ color: theme.muted, textAlign: 'center' }}>
            {mode === 'login'
              ? 'Melde dich mit deinem Benutzerkonto an.'
              : hasAccounts
                ? 'Lege dein Benutzerkonto an, um den Haushalt zu sehen.'
                : 'Lege dein Benutzerkonto an. Weitere Personen fügst du danach unter „Haushalt“ hinzu.'}
          </Text>
        </View>

        <Card>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {mode === 'register' && hasAccounts && open.length > 0 ? (
            <>
              <Label>Wer bist du?</Label>
              <View style={styles.wrap}>
                {open.map((m) => (
                  <Chip key={m.id} label={m.name} color={m.color} selected={memberId === m.id} onPress={() => setMemberId(m.id)} />
                ))}
              </View>
            </>
          ) : null}

          {mode === 'register' ? (
            <>
              <Label>Dein Name</Label>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="z. B. Fabian"
                placeholderTextColor={theme.muted}
                autoComplete="name"
                style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              />
            </>
          ) : null}

          <Label>Benutzername</Label>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="z. B. fabian"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />

          <Label>Passwort</Label>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : 'Passwort'}
            placeholderTextColor={theme.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
            onSubmitEditing={mode === 'login' ? submit : undefined}
            style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />

          {mode === 'register' ? (
            <>
              <Label>Passwort wiederholen</Label>
              <TextInput
                value={repeat}
                onChangeText={setRepeat}
                placeholder="Passwort wiederholen"
                placeholderTextColor={theme.muted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submit}
                style={[inputStyle, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              />
            </>
          ) : null}

          <View style={styles.rememberRow}>
            <Text style={{ color: theme.text, flex: 1 }}>Angemeldet bleiben</Text>
            <Switch value={remember} onValueChange={setRemember} />
          </View>

          {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}

          <View style={{ height: 16 }} />
          {busy ? (
            <ActivityIndicator color={theme.tint} style={{ paddingVertical: 14 }} />
          ) : (
            <Button label={mode === 'login' ? 'Anmelden' : 'Konto erstellen'} onPress={submit} />
          )}

          {mode === 'login' ? (
            <Pressable onPress={forgot} style={styles.link} hitSlop={8}>
              <Text style={{ color: theme.muted }}>Passwort vergessen?</Text>
            </Pressable>
          ) : null}
        </Card>

        {mode === 'login' && canRegister ? (
          <Pressable onPress={() => switchMode('register')} style={styles.link} hitSlop={8}>
            <Text style={{ color: theme.tint, fontWeight: '600' }}>Noch kein Konto? Konto einrichten</Text>
          </Pressable>
        ) : null}
        {mode === 'login' && !canRegister ? (
          <Text style={[styles.hint, { color: theme.muted }]}>
            Neu im Haushalt? Eine angemeldete Person fügt dich unter „Haushalt → Personen“ hinzu. Danach kannst du
            hier dein Konto einrichten.
          </Text>
        ) : null}
        {mode === 'register' && hasAccounts ? (
          <Pressable onPress={() => switchMode('login')} style={styles.link} hitSlop={8}>
            <Text style={{ color: theme.tint, fontWeight: '600' }}>Ich habe schon ein Konto</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 56, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  appName: { fontSize: 26, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  error: { marginTop: 12, lineHeight: 20 },
  link: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  hint: { textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
});
