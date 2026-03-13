import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAudioPlayer } from 'expo-audio';

import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'USTDash'>;

const GRAVITY = 0.6;
const JUMP_IMPULSE = -10;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_INTERVAL = 1800;
const BIRD_SIZE = 40;
const BIRD_X = 60;

const birdImage = require('../../assets/ust-dash-bird.png');
const jumpSound = require('../../assets/ust-dash-jump.mp3');

type GameState = 'ready' | 'playing' | 'gameover';

interface Pipe {
  x: number;
  gapTop: number;
  scored: boolean;
}

export default function USTDashScreen({ navigation }: Props) {
  const t = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const player = useAudioPlayer(jumpSound);

  const [gameAreaHeight, setGameAreaHeight] = useState(0);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [tick, setTick] = useState(0);
  const [score, setScore] = useState(0);

  const birdY = useRef(0);
  const velocity = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>('ready');
  const frameId = useRef(0);
  const lastPipeSpawn = useRef(0);

  const resetGame = useCallback(() => {
    if (gameAreaHeight <= 0) return;
    birdY.current = gameAreaHeight / 2 - BIRD_SIZE / 2;
    velocity.current = 0;
    pipes.current = [];
    scoreRef.current = 0;
    lastPipeSpawn.current = Date.now();
    setScore(0);
  }, [gameAreaHeight]);

  useEffect(() => {
    if (gameAreaHeight > 0) resetGame();
  }, [gameAreaHeight, resetGame]);

  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing' || gameAreaHeight <= 0) return;

    velocity.current += GRAVITY;
    birdY.current += velocity.current;

    const now = Date.now();
    if (now - lastPipeSpawn.current > PIPE_INTERVAL) {
      const minGapTop = 80;
      const maxGapTop = gameAreaHeight - PIPE_GAP - 80;
      const gapTop = minGapTop + Math.random() * (maxGapTop - minGapTop);
      pipes.current.push({ x: screenWidth, gapTop, scored: false });
      lastPipeSpawn.current = now;
    }

    for (let i = pipes.current.length - 1; i >= 0; i--) {
      const pipe = pipes.current[i];
      pipe.x -= PIPE_SPEED;

      if (pipe.x + PIPE_WIDTH < -10) {
        pipes.current.splice(i, 1);
        continue;
      }

      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.scored = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }

      const birdRight = BIRD_X + BIRD_SIZE;
      const birdBottom = birdY.current + BIRD_SIZE;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight > pipe.x && BIRD_X < pipeRight) {
        if (birdY.current < pipe.gapTop || birdBottom > pipe.gapTop + PIPE_GAP) {
          gameStateRef.current = 'gameover';
          setGameState('gameover');
          return;
        }
      }
    }

    if (birdY.current < 0 || birdY.current + BIRD_SIZE > gameAreaHeight) {
      gameStateRef.current = 'gameover';
      setGameState('gameover');
      return;
    }

    setTick(prev => prev + 1);
    frameId.current = requestAnimationFrame(gameLoop);
  }, [gameAreaHeight, screenWidth]);

  useEffect(() => {
    if (gameState === 'playing') {
      frameId.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [gameState, gameLoop]);

  const handleTap = useCallback(() => {
    if (gameStateRef.current === 'ready') {
      resetGame();
      gameStateRef.current = 'playing';
      setGameState('playing');
      velocity.current = JUMP_IMPULSE;
      player.seekTo(0);
      player.play();
      return;
    }

    if (gameStateRef.current === 'playing') {
      velocity.current = JUMP_IMPULSE;
      player.seekTo(0);
      player.play();
    }
  }, [resetGame, player]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    gameStateRef.current = 'playing';
    setGameState('playing');
    velocity.current = JUMP_IMPULSE;
  }, [resetGame]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setGameAreaHeight(e.nativeEvent.layout.height);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="UST Dash" onBack={() => navigation.goBack()} />

      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.gameArea} onLayout={onLayout}>
          {gameAreaHeight > 0 && (
            <>
              <Image
                source={birdImage}
                style={[
                  styles.bird,
                  { top: birdY.current, left: BIRD_X },
                ]}
              />

              {pipes.current.map((pipe, i) => (
                <React.Fragment key={`${i}-${pipe.gapTop}`}>
                  <View
                    style={[
                      styles.pipe,
                      {
                        left: pipe.x,
                        top: 0,
                        height: pipe.gapTop,
                        width: PIPE_WIDTH,
                        backgroundColor: t.colors.success,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.pipe,
                      {
                        left: pipe.x,
                        top: pipe.gapTop + PIPE_GAP,
                        height: gameAreaHeight - pipe.gapTop - PIPE_GAP,
                        width: PIPE_WIDTH,
                        backgroundColor: t.colors.success,
                      },
                    ]}
                  />
                </React.Fragment>
              ))}

              {gameState === 'playing' && (
                <Text style={[styles.scoreText, t.typography.largeTitle, { color: t.colors.text }]}>
                  {score}
                </Text>
              )}

              {gameState === 'ready' && (
                <View style={styles.overlay}>
                  <Text style={[t.typography.title2, styles.overlayText, { color: t.colors.text }]}>
                    Tap to Start!
                  </Text>
                </View>
              )}

              {gameState === 'gameover' && (
                <View style={[styles.overlay, { backgroundColor: t.colors.overlay }]}>
                  <Text style={[t.typography.title1, styles.overlayText, { color: '#fff' }]}>
                    Game Over
                  </Text>
                  <Text style={[t.typography.largeTitle, styles.overlayText, { color: '#fff', marginBottom: 24 }]}>
                    {scoreRef.current}
                  </Text>
                  <TouchableOpacity
                    style={[styles.overlayButton, { backgroundColor: t.colors.accent, borderRadius: t.radius.pill }]}
                    onPress={handlePlayAgain}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, { color: '#fff' }]}>Play Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overlayButton, { backgroundColor: t.colors.muted, borderRadius: t.radius.pill, marginTop: 12 }]}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, { color: '#fff' }]}>Back to Order</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
    overflow: 'hidden',
  },
  bird: {
    position: 'absolute',
    width: BIRD_SIZE,
    height: BIRD_SIZE,
  },
  pipe: {
    position: 'absolute',
    borderRadius: 4,
  },
  scoreText: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  overlayButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
});
