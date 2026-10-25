import { rich } from '../utils/rich';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { authErrorMessage, emailLooksValid, MIN_PASSWORD_LENGTH, copy } from '@grandcityrace/shared';
import { auth, db } from '../firebase';

// Hosting starts here: anyone can make an account and create their own game.
// Players can sign up here too, though they'd normally do it in the app.
export default function LoginPage() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const signingUp = mode === 'signup';

  // Firebase sends the email and hosts the page for choosing a new password.
  // The answer is the same whether or not there is an account.
  async function handleForgotPassword() {
    setError('');
    setNotice('');
    const address = email.trim();
    if (!emailLooksValid(address)) return setError(copy.login.resetNeedsEmail);
    try {
      await sendPasswordResetEmail(auth, address);
      setNotice(copy.login.resetSent(address));
    } catch (err) {
      if (err?.code === 'auth/user-not-found') setNotice(copy.login.resetSent(address));
      else setError(copy.login.resetFailed);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!emailLooksValid(email)) return setError(cc.loginPage.thatEmailAddressDoesnT);
    if (signingUp) {
      if (!name.trim()) return setError(cc.loginPage.enterYourName);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return setError(cc.loginPage.pickAPasswordWithAt({ minPasswordLength: MIN_PASSWORD_LENGTH }));
      }
      if (!accepted) return setError(cc.loginPage.pleaseAcceptTheTermsTo);
    }

    setLoading(true);
    try {
      if (signingUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          email: email.trim(),
          createdAt: Date.now(),
          acceptedTermsAt: Date.now(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 tracking-widest">{cc.loginPage.gcr}</h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          {signingUp ? cc.loginPage.createAnAccountToHost : cc.loginPage.signInToRunYour}
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4"
        >
          {signingUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{cc.loginPage.yourName}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{cc.loginPage.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              autoFocus={!signingUp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{cc.loginPage.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {signingUp && (
            <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-gray-900"
              />
              <span>
                {rich(cc.loginPage.iAgreeToTheAnd({ link: <Link to="/terms" className="underline">{cc.loginPage.terms}</Link>, link2: <Link to="/privacy" className="underline">{cc.loginPage.privacyPolicy}</Link>, link3: <Link to="/guidelines" className="underline">{cc.loginPage.communityGuidelines}</Link> }))}
              </span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {notice && <p className="text-green-700 text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? cc.loginPage.working : signingUp ? cc.loginPage.createAccount : cc.loginPage.signIn}
          </button>
          {!signingUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {copy.login.forgotPassword}
            </button>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          {signingUp ? cc.loginPage.alreadyHaveAnAccount : cc.loginPage.wantToHostYourOwn}{' '}
          <button
            onClick={() => {
              setMode(signingUp ? 'signin' : 'signup');
              setError('');
            }}
            className="text-gray-900 font-medium hover:underline"
          >
            {signingUp ? cc.loginPage.signIn : cc.loginPage.createAnAccount}
          </button>
        </p>
      </div>
    </div>
  );
}
