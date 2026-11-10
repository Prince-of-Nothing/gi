import React from 'react';
import SiteHeader from './SiteHeader.jsx';
import SiteFooter from './SiteFooter.jsx';

export default function Layout({ children, chrome = true }) {
  React.useEffect(() => {
    document.body.classList.add('has-site-nav');
    return () => document.body.classList.remove('has-site-nav');
  }, []);

  if (!chrome) {
    return (
      <>
        <div id="pageTransition" className="page-transition" />
        {children}
      </>
    );
  }

  return (
    <>
      <div id="pageTransition" className="page-transition" />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
