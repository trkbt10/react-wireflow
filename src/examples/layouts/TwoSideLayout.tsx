/**
 * @file Two-side layout primitives for examples.
 * Provides a fixed placement system (sidebar + main canvas).
 */
import * as React from "react";
import styles from "./TwoSideLayout.module.css";

export type TwoSideLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export const TwoSideLayout: React.FC<TwoSideLayoutProps> = ({ children, className }) => {
  const classes = [styles.root, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type TwoSideLayoutSidebarProps = {
  children: React.ReactNode;
  className?: string;
};

export const TwoSideLayoutSidebar: React.FC<TwoSideLayoutSidebarProps> = ({ children, className }) => {
  const classes = [styles.sidebar, className].filter(Boolean).join(" ");
  return <aside className={classes}>{children}</aside>;
};

export type TwoSideLayoutMainProps = {
  children: React.ReactNode;
  className?: string;
};

export const TwoSideLayoutMain: React.FC<TwoSideLayoutMainProps> = ({ children, className }) => {
  const classes = [styles.main, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type TwoSideLayoutCanvasFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export const TwoSideLayoutCanvasFrame: React.FC<TwoSideLayoutCanvasFrameProps> = ({ children, className }) => {
  const classes = [styles.canvasFrame, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type TwoSideLayoutStackProps = {
  children: React.ReactNode;
  className?: string;
};

export const TwoSideLayoutStack: React.FC<TwoSideLayoutStackProps> = ({ children, className }) => {
  const classes = [styles.stack, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

