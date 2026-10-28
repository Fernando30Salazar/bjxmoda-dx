import { useCallback, useRef, useState } from 'react';
import { useRoute, navigate } from './lib/router.js';
import { registerParticipant, startTestSession } from './lib/api.js';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import Landing from './components/Landing.jsx';
import EntryForm from './components/EntryForm.jsx';
import IdentityTest from './components/IdentityTest.jsx';
import SavingScreen from './components/SavingScreen.jsx';
import Reveal from './components/Reveal.jsx';
import ResultView from './components/ResultView.jsx';
import NewFaces from './components/NewFaces.jsx';
import ManageParticipation from './components/ManageParticipation.jsx';

// Etapas de la experiencia: entry → test → saving → reveal → result
const INITIAL = { stage: 'entry', entry: null, answers: null, result: null, error: null };

export default function App() {
  const route = useRoute();
  const [flow, setFlow] = useState(INITIAL);
  const sessionRef = useRef(null);

  const start = useCallback((entry) => {
    sessionRef.current = null;
    // La sesión anónima mide la tasa de finalización; si falla, el test sigue.
    startTestSession().then((id) => {
      sessionRef.current = id;
    });
    setFlow({ ...INITIAL, stage: 'test', entry });
  }, []);

  const save = useCallback(async (entry, answers) => {
    setFlow((f) => ({ ...f, stage: 'saving', answers, error: null }));
    try {
      const result = await registerParticipant({
        publicName: entry.publicName,
        answers,
        termsAccepted: entry.termsAccepted,
        publicConsent: entry.publicConsent,
        sessionId: sessionRef.current,
        website: entry.website,
      });
      setFlow((f) => ({ ...f, stage: 'reveal', result }));
    } catch (error) {
      setFlow((f) => ({ ...f, stage: 'saving', error }));
    }
  }, []);

  const updateResult = useCallback((patch) => {
    setFlow((f) => ({ ...f, result: { ...f.result, ...patch } }));
  }, []);

  const restart = useCallback(() => {
    sessionRef.current = null;
    setFlow(INITIAL);
    navigate('test');
  }, []);

  let main;
  if (route === 'new-faces') main = <NewFaces />;
  else if (route === 'manage') main = <ManageParticipation />;
  else if (route === 'test') {
    if (flow.stage === 'entry') main = <EntryForm initial={flow.entry} onStart={start} />;
    else if (flow.stage === 'test')
      main = (
        <IdentityTest
          initialAnswers={flow.answers}
          onComplete={(answers) => save(flow.entry, answers)}
          onExit={() => setFlow((f) => ({ ...f, stage: 'entry' }))}
        />
      );
    else if (flow.stage === 'saving')
      main = (
        <SavingScreen
          error={flow.error}
          onRetry={() => save(flow.entry, flow.answers)}
          onBack={() => setFlow((f) => ({ ...f, stage: 'test', error: null }))}
        />
      );
    else if (flow.stage === 'reveal')
      main = <Reveal result={flow.result} onDone={() => setFlow((f) => ({ ...f, stage: 'result' }))} />;
    else
      main = (
        <ResultView
          result={flow.result}
          sessionId={flow.result?.sessionLinked ? sessionRef.current : null}
          onReplay={() => setFlow((f) => ({ ...f, stage: 'reveal' }))}
          onRestart={restart}
          onUpdate={updateResult}
        />
      );
  } else main = <Landing />;

  const immersive = route === 'test' && ['test', 'saving', 'reveal'].includes(flow.stage);

  return (
    <div className={`app ${immersive ? 'app--immersive' : ''}`}>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      {!immersive && <SiteHeader route={route} />}
      <main id="main" tabIndex={-1}>
        {main}
      </main>
      {!immersive && <SiteFooter />}
    </div>
  );
}
