import React from 'react';
import MainLayout from '../partials/MainLayout';

const Home: React.FC = () => {
    return (
        <MainLayout>
            <div style={{
                padding: '2rem',
                maxWidth: '1400px',
                margin: '0 auto',
                minHeight: '100vh'
            }}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '2rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h1>Bienvenido a Delicias Ali</h1>
                    <p>Este es el contenido principal de la página de inicio - Prueba de Scroll</p>

                    {/* Generamos mucho contenido para probar el scroll */}
                    {Array.from({ length: 30 }, (_, i) => (
                        <div key={i} style={{
                            padding: '1rem',
                            marginTop: '1rem',
                            borderBottom: '1px solid #e0e0e0',
                            backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#ffffff'
                        }}>
                            <h3>Sección {i + 1}</h3>
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                marginTop: '0.5rem'
                            }}>
                                <span>📊 Ventas</span>
                                <span>🚚 Logística</span>
                                <span>🍳 Cocina</span>
                                <span>📦 Almacén</span>
                            </div>
                        </div>
                    ))}

                    {/* Tarjetas de módulos al final */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                        marginTop: '2rem',
                        paddingTop: '2rem',
                        borderTop: '2px solid #f0f0f0'
                    }}>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>📊 Ventas</h3>
                            <p>Gestión de ventas y pedidos</p>
                        </div>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>🚚 Logística</h3>
                            <p>Seguimiento de entregas</p>
                        </div>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>🍳 Cocina</h3>
                            <p>Producción y preparación</p>
                        </div>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>📦 Almacén</h3>
                            <p>Inventario y stock</p>
                        </div>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>📋 Recepción</h3>
                            <p>Atención al cliente</p>
                        </div>
                        <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}>
                            <h3>⚙️ CRUD General</h3>
                            <p>Administración completa</p>
                        </div>
                    </div>

                    {/* Footer de prueba */}
                    <div style={{
                        marginTop: '3rem',
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        color: '#666'
                    }}>
                        <p>© 2024 Delicias Ali Catering - Todos los derechos reservados</p>
                        <p>📞 Teléfono: (123) 456-7890 | ✉️ Email: info@deliciasali.com</p>
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>📍 Dirección: Calle Principal #123, Ciudad</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default Home;