Ext.define('EstimationBoardApp', {
    extend: 'Rally.app.App',
    alias: 'widget.boardapp',

    requires: [
        'Rally.ui.cardboard.plugin.FixedHeader',
        'Rally.ui.gridboard.GridBoard',
        'Rally.ui.gridboard.plugin.GridBoardAddNew',
        'Rally.ui.gridboard.plugin.GridBoardCustomFilterControl',
        'Rally.ui.gridboard.plugin.GridBoardFieldPicker',
        'Rally.data.util.Sorter',
        'Settings',
        'Rally.clientmetrics.ClientMetricsRecordable'
    ],
    mixins: [
        'Rally.clientmetrics.ClientMetricsRecordable'
    ],

    cls: 'customboard',
    autoScroll: false,
    layout: 'fit',

    config: {
        defaultSettings: {
            types: [
                'HierarchicalRequirement',
                'Defect',
                'DefectSuite'
            ],
            showRows: false,
            sizes: Ext.JSON.encode([
              {text: 'XS', value: 1},
              {text: 'S', value: 2},
              {text: 'M', value: 3},
              {text: 'L', value: 5},
              {text: 'XL', value: 8}
            ])
        }
    },

    launch: function() {
        Rally.data.ModelFactory.getModels({
            types: this.getSetting('types'),
            context: this.getContext().getDataContext()
        }).then({
            success: function (models) {
                this.models = models;
                this.add(this._getGridBoardConfig());
            },
            scope: this
        });
    },

    _getGridBoardConfig: function() {
        var context = this.getContext(),
            modelNames = this.getSetting('types'),
            config = {
                xtype: 'rallygridboard',
                stateful: false,
                toggleState: 'board',
                cardBoardConfig: this._getBoardConfig(),
                plugins: [
                    {
                        ptype:'rallygridboardaddnew',
                        addNewControlConfig: {
                            stateful: true,
                            stateId: context.getScopedStateId('board-add-new')
                        }
                    },
                    {
                        ptype: 'rallygridboardinlinefiltercontrol',
                        inlineFilterButtonConfig: {
                            stateful: true,
                            stateId: context.getScopedStateId('board-filters'),
                            modelNames: modelNames,
                            inlineFilterPanelConfig: {
                                quickFilterPanelConfig: {
                                    defaultFields: [
                                        'ArtifactSearch',
                                        'Owner',
                                        'ModelType'
                                    ],
                                    addQuickFilterConfig: {
                                        whiteListFields: ['Milestones', 'Tags']
                                    }
                                },
                                advancedFilterPanelConfig: {
                                    advancedFilterRowsConfig: {
                                        propertyFieldConfig: {
                                            whiteListFields: ['Milestones', 'Tags']
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        ptype: 'rallygridboardfieldpicker',
                        headerPosition: 'left',
                        boardFieldBlackList: ['Successors', 'Predecessors', 'DisplayColor'],
                        modelNames: modelNames
                    }
                ],
                context: context,
                modelNames: modelNames,
                storeConfig: {
                    filters: this._getFilters()
                },
                listeners: {
                    load: this._onLoad,
                    scope: this
                }
            };
        if(this.getEl()) {
            config.height = this.getHeight();
        }
        return config;
    },

    _onLoad: function() {
        this.recordComponentReady({
            miscData: {
                type: this.getSetting('type'),
                columns: this.getSetting('groupByField'),
                rows: (this.getSetting('showRows') && this.getSetting('rowsField')) || ''
            }
        });
    },

    _getBoardConfig: function() {
        var boardConfig = {
            margin: '10px 0 0 0',
            attribute: 'PlanEstimate',
            context: this.getContext(),
            cardConfig: {
                editable: true,
                showIconMenus: true
            },
            loadMask: true,
            plugins: [{ptype:'rallyfixedheadercardboard'}],
            storeConfig: {
                sorters: Rally.data.util.Sorter.sorters(this.getSetting('order'))
            },
            columnConfig: {
                columnHeaderConfig: {
                    headerTpl: '{size}'
                }
            },
            columns: _.map([{text: 'No Estimate', value: null}].concat(Ext.JSON.decode(this.getSetting('sizes'))), function(size) {
                return {
                    value: size.value,
                    columnHeaderConfig: {
                        headerData: {size: size.text}
                    }
                };
            })
        };
        if (this.getSetting('showRows')) {
            Ext.merge(boardConfig, {
                rowConfig: {
                    field: this.getSetting('rowsField'),
                    sortDirection: 'ASC'
                }
            });
        }
        if (this._shouldDisableRanking()) {
            boardConfig.enableRanking = false;
            boardConfig.enableCrossColumnRanking = false;
            boardConfig.cardConfig.showRankMenuItems = false;
        }
        return boardConfig;
    },

    getSettingsFields: function() {
        return Settings.getFields(this.getContext());
    },

    _shouldDisableRanking: function() {
        return (!this.getSetting('showRows') || this.getSetting('showRows') &&
            this.getSetting('rowsField').toLowerCase() !== 'workproduct');
    },

    _addBoard: function() {
        var gridBoard = this.down('rallygridboard');
        if(gridBoard) {
            gridBoard.destroy();
        }
        this.add(this._getGridBoardConfig());
    },

    onTimeboxScopeChange: function(timeboxScope) {
        this.callParent(arguments);
        this._addBoard();
    },

    _getFilters: function() {
        var queries = [],
            timeboxScope = this.getContext().getTimeboxScope();
        if (this.getSetting('query')) {
            queries.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
        }
        if (timeboxScope && _.all(this.models, function(model) {
                return model.hasField(Ext.String.capitalize(timeboxScope.getType()));
            })) {
            queries.push(timeboxScope.getQueryFilter());
        }

        return queries;
    }
});
