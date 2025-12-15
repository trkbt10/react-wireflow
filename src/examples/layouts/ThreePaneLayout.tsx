/**
 * @file Three-pane layout primitives for examples.
 * Provides a fixed placement system (left sidebar + center canvas + right sidebar).
 */
import * as React from "react";
import styles from "./ThreePaneLayout.module.css";

export type ThreePaneLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({ children, className }) => {
  const classes = [styles.root, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type ThreePaneLayoutLeftProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayoutLeft: React.FC<ThreePaneLayoutLeftProps> = ({ children, className }) => {
  const classes = [styles.left, className].filter(Boolean).join(" ");
  return <aside className={classes}>{children}</aside>;
};

export type ThreePaneLayoutRightProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayoutRight: React.FC<ThreePaneLayoutRightProps> = ({ children, className }) => {
  const classes = [styles.right, className].filter(Boolean).join(" ");
  return <aside className={classes}>{children}</aside>;
};

export type ThreePaneLayoutCenterProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayoutCenter: React.FC<ThreePaneLayoutCenterProps> = ({ children, className }) => {
  const classes = [styles.center, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type ThreePaneLayoutCanvasFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayoutCanvasFrame: React.FC<ThreePaneLayoutCanvasFrameProps> = ({ children, className }) => {
  const classes = [styles.canvasFrame, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

export type ThreePaneLayoutStackProps = {
  children: React.ReactNode;
  className?: string;
};

export const ThreePaneLayoutStack: React.FC<ThreePaneLayoutStackProps> = ({ children, className }) => {
  const classes = [styles.stack, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
};

