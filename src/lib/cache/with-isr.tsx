import { GetStaticPropsContext, GetStaticPropsResult } from 'next';
import React from 'react';

/**
 * Default revalidation time in seconds (1 hour)
 */
const DEFAULT_REVALIDATION_TIME = 3600;

/**
 * Higher-order function to wrap getStaticProps with ISR
 *
 * @param getStaticProps The original getStaticProps function
 * @param revalidate Revalidation time in seconds (defaults to 1 hour)
 * @returns A wrapped getStaticProps function with ISR
 */
export function withISR<P>(
  getStaticProps: (context: GetStaticPropsContext) => Promise<GetStaticPropsResult<P>>,
  revalidate: number = DEFAULT_REVALIDATION_TIME
) {
  return async (context: GetStaticPropsContext): Promise<GetStaticPropsResult<P>> => {
    // Call the original getStaticProps
    const result = await getStaticProps(context);

    // If the result has props, add the revalidate property
    if ('props' in result) {
      return {
        ...result,
        revalidate,
      };
    }

    // Otherwise, just return the original result
    return result;
  };
}

/**
 * Higher-order component to wrap a page component with ISR
 *
 * @param PageComponent The page component to wrap
 * @param revalidate Revalidation time in seconds (defaults to 1 hour)
 * @returns A wrapped component with ISR
 */
export function withISRComponent<P extends React.JSX.IntrinsicAttributes = Record<string, unknown>>(
  PageComponent: React.ComponentType<P>,
  revalidate: number = DEFAULT_REVALIDATION_TIME
) {
  const WrappedComponent = (props: P) => {
    return <PageComponent {...props} />;
  };

  // Copy static methods and display name
  WrappedComponent.displayName = `withISR(${PageComponent.displayName || PageComponent.name || 'Component'})`;

  // Copy getStaticProps if it exists and wrap it with ISR
  const originalGetStaticProps = (PageComponent as any).getStaticProps;
  if (originalGetStaticProps) {
    (WrappedComponent as any).getStaticProps = withISR(originalGetStaticProps, revalidate);
  } else {
    // If the component doesn't have getStaticProps, add a simple one
    (WrappedComponent as any).getStaticProps = async () => {
      return {
        props: {},
        revalidate,
      };
    };
  }

  return WrappedComponent;
}
