import { http, HttpResponse } from 'msw';

interface RegisterData {
  fullName: string;
  email: string;
  cpf: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface ProfileUpdateData {
  fullName?: string;
  email?: string;
  cpf?: string;
}

export const handlers = [
  // Mock registration endpoint
  http.post('http://localhost:3001/auth/register', async ({ request }) => {
    const data = (await request.json()) as RegisterData;
    
    return HttpResponse.json({
      message: 'Usuário registrado com sucesso',
      user: {
        id: 'mock-user-id',
        fullName: data.fullName,
        email: data.email,
        cpf: data.cpf,
      },
    }, { status: 201 });
  }),

  // Mock login endpoint
  http.post('http://localhost:3001/auth/login', async ({ request }) => {
    const data = (await request.json()) as LoginData;
    
    // Simulate authentication
    return HttpResponse.json({
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'mock-user-id',
        fullName: 'Test User',
        email: data.email,
        cpf: '12345678901',
      },
    });
  }),

  // Mock profile update endpoint (PATCH)
  http.patch('http://localhost:3001/users/profile', async ({ request }) => {
    const data = (await request.json()) as ProfileUpdateData;
    
    return HttpResponse.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: 'mock-user-id',
        fullName: data.fullName || 'Test User',
        email: data.email || 'test@example.com',
        cpf: data.cpf || '12345678901',
      },
    });
  }),

  // Mock user profile get endpoint
  http.get('http://localhost:3001/users/profile', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      fullName: 'Test User',
      email: 'test@example.com',
      cpf: '12345678901',
    });
  }),

  // Mock delete user endpoint
  http.delete('http://localhost:3001/users/profile', () => {
    return HttpResponse.json({
      message: 'Usuário deletado com sucesso',
    });
  }),

  // Mock get profile endpoint (full profile for dashboard)
  http.get('http://localhost:3001/users/profile', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      id: 'mock-user-id',
      fullName: 'Test User',
      email: 'test@example.com',
      cpf: '12345678901',
      username: 'testuser',
      displayName: 'Test Display Name',
      bio: 'This is a test bio',
      profilePhoto: '',
      location: 'São Paulo, Brasil',
      socialLinks: {
        instagram: 'https://instagram.com/testuser',
        twitter: 'https://twitter.com/testuser',
      },
    });
  }),

  // Mock get links endpoint
  http.get('http://localhost:3001/links', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    return HttpResponse.json({
      links: [
        {
          id: 'link-1',
          title: 'Meu Site',
          url: 'https://example.com',
          description: 'Meu site pessoal',
          isActive: true,
          isPaid: false,
          order: 0,
        },
        {
          id: 'link-2',
          title: 'Curso Premium',
          url: 'https://curso.example.com',
          description: 'Meu curso pago',
          isActive: true,
          isPaid: true,
          price: 97.00,
          order: 1,
        },
        {
          id: 'link-3',
          title: 'Link Inativo',
          url: 'https://old.example.com',
          description: 'Link desativado',
          isActive: false,
          isPaid: false,
          order: 2,
        },
      ],
    });
  }),

  // Mock public profile endpoint
  http.get('http://localhost:3001/users/profile/:username', ({ params }) => {
    const { username } = params;
    
    return HttpResponse.json({
      username,
      displayName: 'Test Display Name',
      bio: 'This is a test bio',
      profilePhoto: '',
      location: 'São Paulo, Brasil',
      socialLinks: {
        instagram: 'https://instagram.com/testuser',
        twitter: 'https://twitter.com/testuser',
      },
      links: [
        {
          id: 'link-1',
          title: 'Meu Site',
          url: 'https://example.com',
          isActive: true,
          isPaid: false,
          order: 0,
        },
      ],
    });
  }),
];
