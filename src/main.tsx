import { createRoot } from 'react-dom/client';
import '@fontsource-variable/vazirmatn';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import App from './App';
import { preloadBundledSourceFonts } from './editor/font-catalog';
import { allThemeCss, applyTheme, readStoredTheme } from './viewer/themes';
import './styles.css';

const style = document.createElement('style');
style.dataset.themeStyles = 'viewer';
style.textContent = allThemeCss();
document.head.appendChild(style);

applyTheme(readStoredTheme());

preloadBundledSourceFonts();
createRoot(document.getElementById('root')!).render(<App />);
