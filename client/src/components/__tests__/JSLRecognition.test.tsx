import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JSLRecognition from '../JSLRecognition';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('JSLRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('コンポーネントが正常にレンダリングされる', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('日本手話指文字認識')).toBeInTheDocument();
    expect(screen.getByText('リアルタイム手話認識システム')).toBeInTheDocument();
    expect(screen.getByText('カメラ映像')).toBeInTheDocument();
    expect(screen.getByText('リアルタイム認識結果')).toBeInTheDocument();
  });

  test('カメラオンオフスイッチが表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('カメラ')).toBeInTheDocument();
    expect(screen.getByText('OFF')).toBeInTheDocument();
  });

  test('指文字一覧が正しく表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('指文字一覧')).toBeInTheDocument();
    
    // あ行の文字が表示される
    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('い')).toBeInTheDocument();
    expect(screen.getByText('う')).toBeInTheDocument();
    expect(screen.getByText('え')).toBeInTheDocument();
    expect(screen.getByText('お')).toBeInTheDocument();
    
    // か行の文字が表示される
    expect(screen.getByText('か')).toBeInTheDocument();
    expect(screen.getByText('き')).toBeInTheDocument();
    expect(screen.getByText('く')).toBeInTheDocument();
    expect(screen.getByText('け')).toBeInTheDocument();
    expect(screen.getByText('こ')).toBeInTheDocument();
    
    // 複数の要素で使われている説明文（グー、人差し指など）は getAllByText を使う
    const guuElements = screen.getAllByText('グー');
    expect(guuElements.length).toBeGreaterThan(0);
    
    const indexFingerElements = screen.getAllByText('人差指');
    expect(indexFingerElements.length).toBeGreaterThan(0);
  });

  test('認識履歴セクションが表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('認識履歴')).toBeInTheDocument();
    expect(screen.getByText('認識履歴がありません')).toBeInTheDocument();
    expect(screen.getByText('クリア')).toBeInTheDocument();
  });

  test('設定パネルが表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  test('カメラスイッチクリックで状態が変化する', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    } as unknown as MediaStream;

    const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
    });

    renderWithProviders(<JSLRecognition />);
    
    const cameraToggle = screen.getByRole('button', { name: /カメラオンオフ/i });
    
    fireEvent.click(cameraToggle);
    
    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalled();
    });
  });

  test('履歴クリアボタンが機能する', () => {
    renderWithProviders(<JSLRecognition />);
    
    const clearButton = screen.getByRole('button', { name: /クリア/i });
    fireEvent.click(clearButton);
    
    expect(screen.getByText('認識履歴がありません')).toBeInTheDocument();
  });

  test('セッション時間が表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('セッション時間')).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  test('処理統計が表示される', () => {
    renderWithProviders(<JSLRecognition />);
    
    expect(screen.getByText('処理速度')).toBeInTheDocument();
    expect(screen.getByText('手の検出精度')).toBeInTheDocument();
    expect(screen.getByText('総認識回数')).toBeInTheDocument();
  });
});