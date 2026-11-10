import React from 'react';
import SiteHeader from './SiteHeader.jsx';
import SiteFooter from './SiteFooter.jsx';

export default function Layout({ children }) {
  React.useEffect(() => {
    document.body.classList.add('has-site-nav');
  }, []);
  return (
    <>
      <div id="pageTransition" className="page-transition" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
