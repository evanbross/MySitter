/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarContextValue {
  imageLoaded: boolean;
  setImageLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const contextValue = React.useMemo(
    () => ({ imageLoaded, setImageLoaded }),
    [imageLoaded],
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      <div
        className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

function AvatarImage({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const context = React.useContext(AvatarContext);
  const src = typeof props.src === "string" ? props.src : "";

  React.useEffect(() => {
    context?.setImageLoaded(false);
  }, [context?.setImageLoaded, src]);

  if (!src) {
    return null;
  }

  return (
    <img
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
      onLoad={(event) => {
        context?.setImageLoaded(true);
        props.onLoad?.(event);
      }}
      onError={(event) => {
        context?.setImageLoaded(false);
        props.onError?.(event);
      }}
    />
  );
}

function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(AvatarContext);

  if (context?.imageLoaded) {
    return null;
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-slate-700", className)} {...props} />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
