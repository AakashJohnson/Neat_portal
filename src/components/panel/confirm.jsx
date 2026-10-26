'use client';
// assets/js/delete.handler.js: links with data-method="DELETE" and
// data-confirm-* ask with SweetAlert 2 —
//   swal({ title, text, type: 'warning', button }) — and only then send the
//   request. The overlay/modal markup is SweetAlert's; its styles are
//   public/panel/assets/css/sweetalert.css (extracted from vendor.js). A click
//   on the overlay closes it without confirming.
import { useState } from 'react';
import { createPortal } from 'react-dom';

function Swal({ title, text, button, onClose }) {
  return createPortal(
    <div className="swal-overlay swal-overlay--show-modal" tabIndex="-1" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <div className="swal-modal" role="dialog" aria-modal="true">
        <div className="swal-icon swal-icon--warning">
          <span className="swal-icon--warning__body">
            <span className="swal-icon--warning__dot"></span>
          </span>
        </div>
        <div className="swal-title">{title}</div>
        <div className="swal-text">{text}</div>
        <div className="swal-footer">
          <div className="swal-button-container">
            <button className="swal-button swal-button--confirm" onClick={() => onClose(true)} autoFocus>
              {button}
            </button>
            <div className="swal-button__loader">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}


export function DeleteLink({ href, className = 'btn btn-icon', title, confirmTitle, confirmText, confirmButton = 'Yes, delete it!', onConfirm, children, ...rest }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href={href}
        className={className}
        title={title}
        data-method="DELETE"
        data-confirm-title={confirmTitle}
        data-confirm-text={confirmText}
        data-confirm-delete={confirmButton}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        {...rest}
      >
        {children}
      </a>
      {open && (
        <Swal
          title={confirmTitle}
          text={confirmText}
          button={confirmButton}
          onClose={(ok) => {
            setOpen(false);
            if (ok) onConfirm();
          }}
        />
      )}
    </>
  );
}
