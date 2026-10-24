/* Supabase Auth only. Game state remains a local demonstration. */
(() => {
  const $ = id => document.getElementById(id);
  const onAccountPage = !!$('accountForm');
  const message = (text, error = false) => {
    if ($('authMessage')) {
      $('authMessage').textContent = text;
      $('authMessage').dataset.error = String(error);
    }
  };
  if (!window.supabase) {
    message('No se pudo cargar el acceso a tu cuenta. Recarga la página e inténtalo otra vez.', true);
    return;
  }
  const client = window.supabase.createClient(
    'https://bbzcuqtldzwlbxpnqqjb.supabase.co',
    'sb_publishable_MFv2UDTqgD2wa8tV2G_Kyw_XohJtuNQ'
  );
  let mode = 'login', busy = false;
  const nameOf = user => String(user.user_metadata?.display_name || 'Jugador').slice(0, 40);
  const renderUser = user => {
    if ($('accountLink')) $('accountLink').textContent = user ? 'Mi cuenta' : 'Entrar / Registrarse';
    if ($('welcomePlayer')) $('welcomePlayer').textContent = user ? `¡Qué más, ${nameOf(user)}!` : '¡Bienvenido a la mesa!';
    if (!onAccountPage) return;
    $('authForms').hidden = !!user;
    $('signedIn').hidden = !user;
    $('guestLink').hidden = !!user;
    if (user) $('accountName').textContent = nameOf(user);
  };
  const setBusy = value => {
    busy = value;
    if (!onAccountPage) return;
    ['accountSubmit', 'loginTab', 'signupTab', 'signOut'].forEach(id => $(id).disabled = value);
    $('accountSubmit').textContent = value ? 'Un momento…' : mode === 'signup' ? 'Crear mi cuenta' : 'Iniciar sesión';
  };
  const friendlyError = error => {
    const code = error?.code;
    if (code === 'invalid_credentials') return 'El correo o la contraseña no coinciden.';
    if (code === 'email_not_confirmed') return 'Confirma tu correo antes de iniciar sesión. Revisa también la carpeta de spam.';
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Se alcanzó el límite de intentos. Espera unos minutos antes de volver a intentarlo.';
    if (code === 'email_address_not_authorized') return 'El envío de correos de registro todavía necesita configuración del administrador.';
    if (code === 'weak_password') return 'Elige una contraseña más segura, con letras, números y símbolos.';
    return 'No pudimos completar la solicitud. Comprueba tu conexión e inténtalo de nuevo.';
  };
  client.auth.onAuthStateChange((_event, session) => renderUser(session?.user || null));
  client.auth.getSession().then(({data, error}) => {
    if (error) message(friendlyError(error), true);
    renderUser(data?.session?.user || null);
  }).catch(() => message('No se pudo recuperar la sesión. Revisa tu conexión.', true)).finally(() => setBusy(false));
  if (!onAccountPage) return;
  const setMode = next => {
    if (busy) return;
    mode = next;
    $('loginTab').setAttribute('aria-pressed', String(mode === 'login'));
    $('signupTab').setAttribute('aria-pressed', String(mode === 'signup'));
    $('nameField').hidden = mode !== 'signup';
    $('displayName').required = mode === 'signup';
    $('passwordHint').hidden = mode !== 'signup';
    $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    $('password').value = '';
    message(''); setBusy(false);
  };
  $('loginTab').onclick = () => setMode('login');
  $('signupTab').onclick = () => setMode('signup');
  $('accountForm').onsubmit = async event => {
    event.preventDefault();
    if (busy || !$('accountForm').reportValidity()) return;
    const email = $('email').value.trim(), password = $('password').value;
    const displayName = $('displayName').value.trim();
    if (mode === 'signup' && displayName.length < 2) { message('Escribe un nombre de al menos 2 caracteres.', true); return; }
    setBusy(true); message('');
    try {
      const result = mode === 'signup'
        ? await client.auth.signUp({email, password, options:{data:{display_name:displayName}, emailRedirectTo:'https://truco-venezolano-en-vivo.espinozap81.workers.dev/'}})
        : await client.auth.signInWithPassword({email, password});
      if (result.error) throw result.error;
      $('password').value = '';
      renderUser(result.data?.session?.user || null);
      message(result.data?.session ? 'Ya puedes entrar a la demostración con tu cuenta.' : 'Si el correo admite el registro, recibirás un enlace para confirmar tu cuenta. Revisa tu bandeja y spam.');
    } catch (error) { message(friendlyError(error), true); }
    finally { setBusy(false); }
  };
  $('signOut').onclick = async () => {
    if (busy) return;
    setBusy(true); message('');
    try {
      const {error} = await client.auth.signOut({scope:'local'});
      if (error) throw error;
      renderUser(null); message('Cerraste la sesión en este dispositivo.');
    } catch (error) { message(friendlyError(error), true); }
    finally { setBusy(false); }
  };
})();
