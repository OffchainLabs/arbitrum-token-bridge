import React, { Fragment } from 'react';
import { Transition as HeadlessUITransition } from '@headlessui/react';

type TransitionDuration = 'fast' | 'normal';

function getDurationNumbers(
	duration: TransitionDuration
): [enterDuration: number, leaveDuration: number] {
	switch (duration) {
		case 'fast':
			return [150, 100];

		case 'normal':
			return [300, 200];
	}
}

export function getTransitionProps(duration: TransitionDuration = 'fast') {
	const [enterDuration, leaveDuration] = getDurationNumbers(duration);

	return {
		enter: `transition ease-out duration-${enterDuration}`,
		enterFrom: 'opacity-0',
		enterTo: 'opacity-100',
		leave: `transition ease-out duration-${leaveDuration}`,
		leaveFrom: 'opacity-100',
		leaveTo: 'opacity-0',
	};
}

export type TransitionProps = {
	duration?: TransitionDuration;
	show?: boolean;
	appear?: boolean;
	children: React.ReactNode;
};

export function Transition({
	duration = 'fast',
	show,
	children,
}: TransitionProps) {
	return (
		<HeadlessUITransition
			appear
			as={Fragment}
			show={show}
			{...getTransitionProps(duration)}
		>
			<div>{children}</div>
		</HeadlessUITransition>
	);
}
