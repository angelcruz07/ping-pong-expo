import { useEffect, useState } from 'react'
import {
	View,
	StyleSheet,
	useWindowDimensions,
	Text,
	Button
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
	BounceIn
} from 'react-native-reanimated'

const FPS = 60
const DELTA = 1000 / FPS
const SPEED = 20
const BALL_WIDTH = 25

const islandDimensions = { x: 150, y: 11, w: 127, h: 37 }

const normalizeVector = (vector: { x: number; y: number }) => {
	const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)

	return {
		x: vector.x / magnitude,
		y: vector.y / magnitude
	}
}

export default function Game() {
	const { height, width } = useWindowDimensions()
	const playerDimensions = {
		w: width / 2,
		h: 37
	}

	const [score, setScore] = useState(0)
	const [gameOver, setGameOver] = useState(true)

	const targetPositionX = useSharedValue(width / 2)
	const targetPositionY = useSharedValue(height / 2)
	const direction = useSharedValue(
		normalizeVector({ x: Math.random(), y: Math.random() })
	)

	const playerPosition = useSharedValue({ x: width / 4, y: height - 150 })

	useEffect(() => {
		const interval = setInterval(() => {
			if (!gameOver) {
				update()
			}
		}, DELTA)

		return () => {
			clearInterval(interval)
		}
	}, [gameOver])

	const update = () => {
		if (gameOver) {
			return
		}

		let nextPos = getNextPosition(direction.value)
		let newDirection = direction.value

		// Wall hit detection
		if (nextPos.y > height - BALL_WIDTH) {
			setGameOver(true)
		}
		if (nextPos.y < 0 || nextPos.y > height - BALL_WIDTH) {
			newDirection = { x: direction.value.x, y: -direction.value.y }
		}

		if (nextPos.x < 0 || nextPos.x > width - BALL_WIDTH) {
			newDirection = { x: -direction.value.x, y: direction.value.y }
		}

		//Island hit detection
		if (
			nextPos.x < islandDimensions.x + islandDimensions.w &&
			nextPos.x + BALL_WIDTH > islandDimensions.x &&
			nextPos.y < islandDimensions.y + islandDimensions.h &&
			BALL_WIDTH + nextPos.y > islandDimensions.y
		) {
			if (
				targetPositionX.value < islandDimensions.x ||
				targetPositionX.value > islandDimensions.x + islandDimensions.w
			) {
				newDirection = { x: -direction.value.x, y: direction.value.y }
			} else {
				newDirection = { x: direction.value.x, y: -direction.value.y }
			}
			setScore((score) => score + 1)
		}

		//Player hit detection
		if (
			nextPos.x < playerPosition.value.x + playerDimensions.w &&
			nextPos.x + BALL_WIDTH > playerPosition.value.x &&
			nextPos.y < playerPosition.value.y + playerDimensions.h &&
			BALL_WIDTH + nextPos.y > playerPosition.value.y
		) {
			if (
				targetPositionX.value < playerPosition.value.x ||
				targetPositionX.value > playerPosition.value.x + playerDimensions.w
			) {
				newDirection = { x: -direction.value.x, y: direction.value.y }
			} else {
				newDirection = { x: direction.value.x, y: -direction.value.y }
			}
		}

		direction.value = newDirection
		nextPos = getNextPosition(newDirection)

		targetPositionX.value = withTiming(nextPos.x, {
			duration: DELTA,
			easing: Easing.linear
		})
		targetPositionY.value = withTiming(nextPos.y, {
			duration: DELTA,
			easing: Easing.linear
		})
	}
	const getNextPosition = (direction: { x: number; y: number }) => {
		return {
			x: targetPositionX.value + direction.x * SPEED,
			y: targetPositionY.value + direction.y * SPEED
		}
	}

	const ballAnimatedStyles = useAnimatedStyle(() => {
		return {
			top: targetPositionY.value,
			left: targetPositionX.value
		}
	})

	const islandAnimatedStyles = useAnimatedStyle(
		() => ({
			width: withSequence(
				withTiming(islandDimensions.w * 1.3),
				withTiming(islandDimensions.w)
			),

			height: withSequence(
				withTiming(islandDimensions.h * 1.3),
				withTiming(islandDimensions.h)
			),

			opacity: withSequence(withTiming(0), withTiming(1))
		}),
		[score]
	)

	const playerAnimatedStyles = useAnimatedStyle(() => ({
		left: playerPosition.value.x
	}))

	const gestureHandler = Gesture.Pan()
		.onUpdate((event) => {
			playerPosition.value = {
				x: event.translationX + width / 4,
				y: height - 150
			}
		})
		.onEnd(() => {
			playerPosition.value = {
				x: Math.min(
					Math.max(playerPosition.value.x, 0),
					width - playerDimensions.w
				),
				y: height - 150
			}
		})

	const restartGame = () => {
		targetPositionX.value = width / 2
		targetPositionY.value = height / 2
		setScore(0)
		setGameOver(false)
	}

	return (
		<View style={styles.container}>
			{/* Score */}
			<Text style={styles.score}>{score}</Text>

			{gameOver && (
				<View style={styles.gameOverContainer}>
					<Text style={styles.gameOver}>Game over</Text>
					<Button title='Reiniciar' onPress={restartGame} />
				</View>
			)}

			{!gameOver && <Animated.View style={[styles.ball, ballAnimatedStyles]} />}
			{/* Island */}
			<Animated.View
				entering={BounceIn}
				key={score}
				style={{
					position: 'absolute',
					top: islandDimensions.y,
					left: islandDimensions.x,
					width: islandDimensions.w,
					height: islandDimensions.h,
					borderRadius: 20,
					backgroundColor: '#000'
				}}
			/>

			{/* Player */}
			<Animated.View
				style={[
					{
						position: 'absolute',
						top: playerPosition.value.y,
						left: playerPosition.value.x,
						width: playerDimensions.w,
						height: playerDimensions.h,
						borderRadius: 20,
						backgroundColor: '#000'
					},
					playerAnimatedStyles
				]}></Animated.View>
			<GestureDetector gesture={gestureHandler}>
				<View
					style={{
						width: '100%',
						height: 200,
						position: 'absolute',
						bottom: 0
					}}></View>
			</GestureDetector>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center'
	},
	ball: {
		position: 'absolute',
		width: BALL_WIDTH,
		aspectRatio: 1,
		borderRadius: 25,
		backgroundColor: '#000'
	},
	island: {
		position: 'absolute',
		top: islandDimensions.y,
		left: islandDimensions.x,
		bottom: 30,
		borderRadius: 20,
		backgroundColor: '#fff'
	},
	score: {
		fontSize: 150,
		fontWeight: '300',
		position: 'absolute',
		top: 150,
		color: 'lightgray'
	},
	gameOverContainer: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		alignItems: 'center',
		justifyContent: 'center'
	},
	gameOver: {
		position: 'absolute',
		top: 300,
		color: 'red',
		fontSize: 30
	}
})
