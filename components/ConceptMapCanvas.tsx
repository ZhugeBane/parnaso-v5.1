import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChapterConceptMap, ConceptNode, ConceptEdge, User } from '../types';
import {
  getChapterConceptMaps,
  saveChapterConceptMap,
  deleteChapterConceptMap
} from '../services/projectCreativeService';

interface ConceptMapCanvasProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  event: { label: 'Acontecimento', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: '#10b981' },
  clue: { label: 'Pista', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: '#f59e0b' },
  conflict: { label: 'Conflito', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: '#f43f5e' },
  twist: { label: 'Reviravolta', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: '#a855f7' },
  character: { label: 'Personagem', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: '#3b82f6' },
  setting: { label: 'Cenário', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: '#14b8a6' },
  idea: { label: 'Ideia Geral', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: '#64748b' },
};

const DEFAULT_NODE_COLORS = ['#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#fbbf24', '#34d399'];

export const ConceptMapCanvas: React.FC<ConceptMapCanvasProps> = ({ projectId, user, readOnly = false }) => {
  const [maps, setMaps] = useState<ChapterConceptMap[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New chapter modal
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState<number>(1);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Node editing / creating modal
  const [editingNode, setEditingNode] = useState<Partial<ConceptNode> | null>(null);
  const [isNewNode, setIsNewNode] = useState(false);

  // Connecting mode (creating edge between 2 nodes)
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);
  const [edgeLabelModal, setEdgeLabelModal] = useState<{ fromId: string; toId: string } | null>(null);
  const [newEdgeLabel, setNewEdgeLabel] = useState('');

  // Canvas zoom and pan
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging state for nodes
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load maps on mount or project change
  useEffect(() => {
    loadMaps();
  }, [projectId]);

  const loadMaps = async () => {
    setIsLoading(true);
    try {
      const loaded = await getChapterConceptMaps(projectId, user.id);
      setMaps(loaded);
      if (loaded.length > 0) {
        setSelectedMapId(loaded[0].id);
        setNewChapterNumber(loaded.length + 1);
      } else {
        setSelectedMapId(null);
        setNewChapterNumber(1);
      }
    } catch (e) {
      console.error('Erro ao carregar mapas conceituais:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMap = useMemo(() => {
    return maps.find(m => m.id === selectedMapId) || null;
  }, [maps, selectedMapId]);

  // Handle saving current map changes
  const updateActiveMap = async (updated: ChapterConceptMap) => {
    setMaps(prev => prev.map(m => m.id === updated.id ? updated : m));
    setIsSaving(true);
    try {
      await saveChapterConceptMap(updated, user.id);
    } catch (e) {
      console.error('Erro ao salvar mapa:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new chapter map
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    const newMap: ChapterConceptMap = {
      id: '',
      projectId,
      userId: user.id,
      chapterNumber: Number(newChapterNumber) || (maps.length + 1),
      chapterTitle: newChapterTitle.trim(),
      nodes: [
        {
          id: 'node_' + Date.now(),
          title: 'Abertura do Capítulo',
          description: 'Defina aqui o gancho inicial ou situação deste capítulo.',
          category: 'event',
          color: '#10b981',
          x: 80,
          y: 80
        }
      ],
      edges: [],
      createdAt: new Date().toISOString()
    };

    setIsSaving(true);
    try {
      const saved = await saveChapterConceptMap(newMap, user.id);
      setMaps(prev => [...prev, saved].sort((a, b) => a.chapterNumber - b.chapterNumber));
      setSelectedMapId(saved.id);
      setShowNewChapterModal(false);
      setNewChapterTitle('');
      setNewChapterNumber(maps.length + 2);
    } catch (err) {
      console.error('Erro ao criar capítulo:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete chapter map
  const handleDeleteChapter = async (mapId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este capítulo e todo seu mapa conceitual?')) return;
    try {
      await deleteChapterConceptMap(mapId, projectId);
      const remaining = maps.filter(m => m.id !== mapId);
      setMaps(remaining);
      setSelectedMapId(remaining.length > 0 ? remaining[0].id : null);
    } catch (e) {
      console.error('Erro ao excluir capítulo:', e);
    }
  };

  // Start adding a new node
  const handleOpenAddNode = () => {
    if (!activeMap) return;
    setEditingNode({
      id: 'node_' + Date.now(),
      title: '',
      description: '',
      category: 'event',
      color: DEFAULT_NODE_COLORS[Math.floor(Math.random() * DEFAULT_NODE_COLORS.length)],
      x: 120 + Math.floor(Math.random() * 200),
      y: 120 + Math.floor(Math.random() * 150)
    });
    setIsNewNode(true);
  };

  // Save node (new or edited)
  const handleSaveNode = () => {
    if (!activeMap || !editingNode || !editingNode.title?.trim()) return;

    let updatedNodes = [...activeMap.nodes];
    if (isNewNode) {
      updatedNodes.push(editingNode as ConceptNode);
    } else {
      updatedNodes = updatedNodes.map(n => n.id === editingNode.id ? { ...n, ...editingNode } as ConceptNode : n);
    }

    updateActiveMap({
      ...activeMap,
      nodes: updatedNodes
    });

    setEditingNode(null);
    setIsNewNode(false);
  };

  // Delete node and associated edges
  const handleDeleteNode = (nodeId: string) => {
    if (!activeMap) return;
    const updatedNodes = activeMap.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = activeMap.edges.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId);

    updateActiveMap({
      ...activeMap,
      nodes: updatedNodes,
      edges: updatedEdges
    });

    if (connectingSourceNodeId === nodeId) {
      setConnectingSourceNodeId(null);
    }
  };

  // Node Dragging Handlers
  const handleMouseDownNode = (e: React.MouseEvent, node: ConceptNode) => {
    if (readOnly || connectingSourceNodeId) return;
    e.stopPropagation();
    setDraggedNodeId(node.id);
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y
    });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggedNodeId || !activeMap) return;
    const newX = Math.max(20, Math.round(e.clientX / zoom - dragOffset.x));
    const newY = Math.max(20, Math.round(e.clientY / zoom - dragOffset.y));

    setMaps(prev => prev.map(m => {
      if (m.id !== activeMap.id) return m;
      return {
        ...m,
        nodes: m.nodes.map(n => n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n)
      };
    }));
  };

  const handleMouseUpCanvas = () => {
    if (draggedNodeId && activeMap) {
      updateActiveMap(activeMap);
      setDraggedNodeId(null);
    }
  };

  // Connection Click Handler
  const handleNodeClickForConnection = (nodeId: string) => {
    if (!connectingSourceNodeId) {
      // First node selected
      setConnectingSourceNodeId(nodeId);
    } else {
      if (connectingSourceNodeId === nodeId) {
        // Deselect
        setConnectingSourceNodeId(null);
        return;
      }
      // Second node selected: open edge label prompt
      setEdgeLabelModal({ fromId: connectingSourceNodeId, toId: nodeId });
      setNewEdgeLabel('');
      setConnectingSourceNodeId(null);
    }
  };

  // Confirm edge creation
  const handleConfirmCreateEdge = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeMap || !edgeLabelModal) return;

    // Check if connection already exists
    const exists = activeMap.edges.some(
      edge => edge.fromNodeId === edgeLabelModal.fromId && edge.toNodeId === edgeLabelModal.toId
    );

    if (!exists) {
      const newEdge: ConceptEdge = {
        id: 'edge_' + Date.now(),
        fromNodeId: edgeLabelModal.fromId,
        toNodeId: edgeLabelModal.toId,
        label: newEdgeLabel.trim() || undefined
      };

      updateActiveMap({
        ...activeMap,
        edges: [...activeMap.edges, newEdge]
      });
    }

    setEdgeLabelModal(null);
  };

  // Delete edge
  const handleDeleteEdge = (edgeId: string) => {
    if (!activeMap || readOnly) return;
    updateActiveMap({
      ...activeMap,
      edges: activeMap.edges.filter(e => e.id !== edgeId)
    });
  };

  // Calculate coordinates for nodes centers to draw smooth SVG bezier curves
  const getNodeCenter = (nodeId: string) => {
    const node = activeMap?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    // Node card estimated dimensions: 210px width, 100px height
    return {
      x: node.x + 105,
      y: node.y + 50
    };
  };

  return (
    <div className="space-y-6">
      {/* Chapter Selection Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 text-sm">Mapas Conceituais por Capítulo</h3>
            <p className="text-xs text-slate-500">Organize os eventos, ideias, pistas e reviravoltas conectando os pontos</p>
          </div>
        </div>

        {/* Chapters selector & action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {maps.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Capítulo:</label>
              <select
                value={selectedMapId || ''}
                onChange={(e) => setSelectedMapId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {maps.map(m => (
                  <option key={m.id} value={m.id}>
                    Capítulo {m.chapterNumber}: {m.chapterTitle}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setShowNewChapterModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Novo Capítulo</span>
              </button>

              {activeMap && (
                <button
                  type="button"
                  onClick={() => handleDeleteChapter(activeMap.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Excluir capítulo atual"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Canvas View */}
      {maps.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 text-3xl">
            🗺️
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum capítulo planejado ainda</h3>
          <p className="text-sm text-slate-500 mb-6">
            Crie seu primeiro capítulo para começar a posicionar pontos e desenhar as conexões da sua trama.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowNewChapterModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              + Criar Primeiro Capítulo
            </button>
          )}
        </div>
      ) : activeMap ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Canvas Toolbar */}
          <div className="p-3 sm:p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Capítulo {activeMap.chapterNumber}: <span className="text-indigo-600">{activeMap.chapterTitle}</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
                {activeMap.nodes.length} pontos • {activeMap.edges.length} conexões
              </span>
              {isSaving && (
                <span className="text-[11px] text-teal-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  Salvando...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenAddNode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar Ponto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (connectingSourceNodeId) {
                        setConnectingSourceNodeId(null);
                      } else {
                        if (activeMap.nodes.length < 2) {
                          alert('Adicione pelo menos 2 pontos para poder criar conexões entre eles.');
                          return;
                        }
                        setConnectingSourceNodeId(activeMap.nodes[0].id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      connectingSourceNodeId
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{connectingSourceNodeId ? 'Cancelar Ligação' : 'Ligar Pontos'}</span>
                  </button>
                </>
              )}

              {/* Zoom controls */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  title="Diminuir zoom"
                >
                  -
                </button>
                <span className="px-2 text-[11px] font-bold text-slate-500 border-x border-slate-200">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(1.6, z + 0.1))}
                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  title="Aumentar zoom"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Connection prompt banner */}
          {connectingSourceNodeId && (
            <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-4 text-xs font-semibold text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>
                  Modo de Ligação: Clique no <strong>segundo ponto</strong> que você deseja conectar a "
                  {activeMap.nodes.find(n => n.id === connectingSourceNodeId)?.title}
                  ".
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConnectingSourceNodeId(null)}
                className="text-amber-900 font-bold hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Interactive Workspace Area */}
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            className="relative h-[620px] w-full overflow-auto bg-[#f8fafc] cursor-crosshair select-none"
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`
            }}
          >
            <div
              className="relative min-w-[1600px] min-h-[1200px]"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: '0 0'
              }}
            >
              {/* SVG Layer for Curved Connections & Arrows */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                  </marker>
                  <marker
                    id="arrowhead-active"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                  </marker>
                </defs>

                {activeMap.edges.map(edge => {
                  const from = getNodeCenter(edge.fromNodeId);
                  const to = getNodeCenter(edge.toNodeId);
                  const midX = (from.x + to.x) / 2;
                  const midY = (from.y + to.y) / 2;

                  // Curvature offset
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const cx = midX - dy * 0.15;
                  const cy = midY + dx * 0.15;

                  const pathData = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

                  return (
                    <g key={edge.id} className="pointer-events-auto group">
                      {/* Thicker hover target */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="18"
                        className="cursor-pointer"
                        onClick={() => {
                          if (window.confirm('Deseja remover esta linha de conexão?')) {
                            handleDeleteEdge(edge.id);
                          }
                        }}
                      />
                      {/* Visible connection line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeDasharray="none"
                        markerEnd="url(#arrowhead)"
                        className="group-hover:stroke-rose-500 transition-colors"
                      />

                      {/* Edge Label Pill */}
                      {edge.label && (
                        <g transform={`translate(${cx}, ${cy})`}>
                          <rect
                            x={-(edge.label.length * 4 + 10)}
                            y="-11"
                            width={edge.label.length * 8 + 20}
                            height="22"
                            rx="11"
                            fill="#ffffff"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            className="shadow-xs cursor-pointer group-hover:border-rose-300"
                            onClick={() => handleDeleteEdge(edge.id)}
                          />
                          <text
                            textAnchor="middle"
                            dy="4"
                            fontSize="11"
                            fontWeight="600"
                            fill="#475569"
                            className="pointer-events-none select-none"
                          >
                            {edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Node Cards */}
              {activeMap.nodes.map(node => {
                const categoryConfig = CATEGORY_STYLES[node.category || 'event'] || CATEGORY_STYLES.event;
                const isConnectingSource = connectingSourceNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleMouseDownNode(e, node)}
                    onClick={() => {
                      if (connectingSourceNodeId) {
                        handleNodeClickForConnection(node.id);
                      }
                    }}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`
                    }}
                    className={`absolute w-[220px] rounded-2xl bg-white border-2 shadow-md transition-shadow z-20 cursor-move ${
                      isConnectingSource
                        ? 'border-amber-500 ring-4 ring-amber-200 shadow-xl'
                        : connectingSourceNodeId
                          ? 'border-slate-300 hover:border-amber-400 hover:scale-102 cursor-pointer'
                          : 'border-slate-200/90 hover:shadow-xl hover:border-slate-400'
                    }`}
                  >
                    {/* Card Category Header */}
                    <div className="p-2.5 pb-1 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: node.color || categoryConfig.dot }}
                        />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${categoryConfig.bg} ${categoryConfig.text}`}>
                          {categoryConfig.label}
                        </span>
                      </div>

                      {!readOnly && !connectingSourceNodeId && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNode(node);
                              setIsNewNode(false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                            title="Editar ponto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                            title="Excluir ponto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-3">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">
                        {node.title}
                      </h4>
                      {node.description && (
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                          {node.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Connect Button / Indicator */}
                    {!readOnly && (
                      <div className="px-3 pb-2 pt-0 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeClickForConnection(node.id);
                          }}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                            isConnectingSource
                              ? 'bg-amber-100 text-amber-800'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="Ligar a outro ponto"
                        >
                          <span>🔗</span>
                          <span>{isConnectingSource ? 'Selecionado' : 'Conectar'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: NOVO CAPÍTULO */}
      {showNewChapterModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📖</span>
              <span>Criar Novo Capítulo</span>
            </h3>

            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Número do Capítulo</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newChapterNumber}
                  onChange={(e) => setNewChapterNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título ou Resumo do Capítulo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: O Encontro na Floresta Sombria"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewChapterModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  {isSaving ? 'Criando...' : 'Criar Capítulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR PONTO (NÓ) */}
      {editingNode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📍</span>
              <span>{isNewNode ? 'Adicionar Ponto de Ideia' : 'Editar Ponto'}</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título do Ponto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: O assassino deixa um bilhete cifrado"
                  value={editingNode.title || ''}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Categoria</label>
                <select
                  value={editingNode.category || 'event'}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {Object.entries(CATEGORY_STYLES).map(([catKey, config]) => (
                    <option key={catKey} value={catKey}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Detalhes / Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o que acontece, que pistas são descobertas ou o que motiva esta ideia..."
                  value={editingNode.description || ''}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Cor do Ponto</label>
                <div className="flex items-center gap-2">
                  {DEFAULT_NODE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingNode(prev => ({ ...prev, color: c }))}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        editingNode.color === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-2' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNode}
                  disabled={!editingNode.title?.trim()}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  Salvar Ponto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RÓTULO DA CONEXÃO */}
      {edgeLabelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span>🔗</span>
              <span>Ligar Pontos</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Deseja adicionar uma relação ou legenda para esta conexão? (opcional)
            </p>

            <form onSubmit={handleConfirmCreateEdge} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Ex: Leva a, Revela que, Consequência de..."
                  value={newEdgeLabel}
                  onChange={(e) => setNewEdgeLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEdgeLabelModal(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Conectar Pontos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
