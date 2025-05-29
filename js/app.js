// Estrutura de dados para armazenar a árvore genealógica
class FamilyTree {
    constructor() {
        this.people = [];
        this.relationships = [];
        this.autoCompleteAPI = new AutoCompleteAPI();
    }

    // Adicionar uma nova pessoa à árvore
    addPerson(person) {
        // Verificar se a pessoa já existe (pelo ID)
        if (!this.people.some(p => p.id === person.id)) {
            this.people.push(person);
        }
        return person;
    }

    // Adicionar um relacionamento entre duas pessoas
    addRelationship(relationship) {
        this.relationships.push(relationship);
    }

    // Obter uma pessoa pelo ID
    getPersonById(id) {
        return this.people.find(person => person.id === id);
    }

    // Obter todas as pessoas
    getAllPeople() {
        return this.people;
    }

    // Obter todos os relacionamentos
    getAllRelationships() {
        return this.relationships;
    }

    // Limpar a árvore
    clear() {
        this.people = [];
        this.relationships = [];
    }

    // Exportar a árvore como JSON
    toJSON() {
        return JSON.stringify({
            people: this.people,
            relationships: this.relationships
        });
    }

    // Importar a árvore a partir de JSON
    fromJSON(json) {
        try {
            const data = JSON.parse(json);
            this.people = data.people || [];
            this.relationships = data.relationships || [];
            return true;
        } catch (e) {
            console.error("Erro ao importar dados:", e);
            return false;
        }
    }

    // Obter os pais de uma pessoa
    getParents(personId) {
        return this.relationships
            .filter(rel => rel.type === 'parent-child' && rel.childId === personId)
            .map(rel => this.getPersonById(rel.parentId));
    }

    // Obter os filhos de uma pessoa
    getChildren(personId) {
        return this.relationships
            .filter(rel => rel.type === 'parent-child' && rel.parentId === personId)
            .map(rel => this.getPersonById(rel.childId));
    }

    // Obter os cônjuges de uma pessoa
    getSpouses(personId) {
        return this.relationships
            .filter(rel => rel.type === 'spouse' && (rel.person1Id === personId || rel.person2Id === personId))
            .map(rel => {
                return this.getPersonById(rel.person1Id === personId ? rel.person2Id : rel.person1Id);
            });
    }

    // Obter os irmãos de uma pessoa
    getSiblings(personId) {
        // Encontrar os pais
        const parents = this.getParents(personId);
        
        // Conjunto para armazenar irmãos únicos
        const siblings = new Set();
        
        // Para cada pai, encontrar todos os seus filhos
        parents.forEach(parent => {
            const children = this.getChildren(parent.id);
            children.forEach(child => {
                // Não incluir a própria pessoa
                if (child.id !== personId) {
                    siblings.add(child);
                }
            });
        });
        
        return Array.from(siblings);
    }

    // Converter para o formato necessário para D3.js
    toD3Format(rootPersonId = null) {
        // Se não houver pessoas, retornar null
        if (this.people.length === 0) {
            return null;
        }

        // Se não for especificado um ID raiz, usar a primeira pessoa
        const rootId = rootPersonId || this.people[0].id;
        const rootPerson = this.getPersonById(rootId);
        
        if (!rootPerson) {
            return null;
        }

        // Função recursiva para construir a árvore
        const buildTree = (personId, visited = new Set()) => {
            // Evitar ciclos infinitos
            if (visited.has(personId)) {
                return null;
            }
            
            visited.add(personId);
            const person = this.getPersonById(personId);
            
            if (!person) {
                return null;
            }

            // Criar o nó para esta pessoa
            const node = {
                id: person.id,
                name: person.name,
                gender: person.gender,
                birthDate: person.birthDate,
                deathDate: person.deathDate,
                data: person,
                children: []
            };

            // Adicionar cônjuges
            const spouses = this.getSpouses(personId);
            spouses.forEach(spouse => {
                if (!visited.has(spouse.id)) {
                    node.children.push({
                        id: spouse.id,
                        name: spouse.name,
                        gender: spouse.gender,
                        birthDate: spouse.birthDate,
                        deathDate: spouse.deathDate,
                        data: spouse,
                        relationship: 'spouse',
                        children: []
                    });
                }
            });

            // Adicionar filhos
            const children = this.getChildren(personId);
            children.forEach(child => {
                const childNode = buildTree(child.id, new Set(visited));
                if (childNode) {
                    childNode.relationship = 'child';
                    node.children.push(childNode);
                }
            });

            // Adicionar pais (apenas se estamos na raiz)
            if (personId === rootId) {
                const parents = this.getParents(personId);
                parents.forEach(parent => {
                    if (!visited.has(parent.id)) {
                        const parentNode = {
                            id: parent.id,
                            name: parent.name,
                            gender: parent.gender,
                            birthDate: parent.birthDate,
                            deathDate: parent.deathDate,
                            data: parent,
                            relationship: 'parent',
                            children: []
                        };
                        
                        // Adicionar o outro pai, se existir
                        const otherParents = this.getSpouses(parent.id);
                        otherParents.forEach(otherParent => {
                            if (!visited.has(otherParent.id) && !parents.some(p => p.id === otherParent.id)) {
                                parentNode.children.push({
                                    id: otherParent.id,
                                    name: otherParent.name,
                                    gender: otherParent.gender,
                                    birthDate: otherParent.birthDate,
                                    deathDate: otherParent.deathDate,
                                    data: otherParent,
                                    relationship: 'spouse',
                                    children: []
                                });
                            }
                        });
                        
                        node.children.push(parentNode);
                    }
                });
            }

            // Adicionar irmãos (apenas se estamos na raiz)
            if (personId === rootId) {
                const siblings = this.getSiblings(personId);
                siblings.forEach(sibling => {
                    if (!visited.has(sibling.id)) {
                        const siblingNode = {
                            id: sibling.id,
                            name: sibling.name,
                            gender: sibling.gender,
                            birthDate: sibling.birthDate,
                            deathDate: sibling.deathDate,
                            data: sibling,
                            relationship: 'sibling',
                            children: []
                        };
                        
                        node.children.push(siblingNode);
                    }
                });
            }

            return node;
        };

        return buildTree(rootId);
    }
}

// Classe para representar uma pessoa
class Person {
    constructor(name, gender, birthDate = null, deathDate = null) {
        this.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.deathDate = deathDate;
    }
}

// Classe para representar um relacionamento
class Relationship {
    constructor(type, person1Id, person2Id = null, childId = null) {
        this.id = 'r_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.type = type;
        
        if (type === 'parent-child') {
            this.parentId = person1Id;
            this.childId = childId;
        } else if (type === 'spouse') {
            this.person1Id = person1Id;
            this.person2Id = person2Id;
        } else if (type === 'sibling') {
            this.person1Id = person1Id;
            this.person2Id = person2Id;
        }
    }
}

// Classe para autocompletar a árvore genealógica
class AutoCompleteAPI {
    constructor() {
        // Flag para indicar se devemos usar dados reais ou gerados
        this.useRealData = true;
        
        // APIs de genealogia disponíveis
        this.genealogyAPIs = [
            { name: 'FamilySearch', url: 'https://api.familysearch.org/platform/tree/persons' },
            { name: 'WikiTree', url: 'https://api.wikitree.com/api.php' },
            { name: 'Geni', url: 'https://www.geni.com/api' }
        ];
        
        // Banco de dados de sobrenomes comuns brasileiros e suas origens
        this.surnameDatabase = {
            'Silva': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Santos': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Oliveira': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Souza': { origin: 'Portugal', commonRegions: ['Nordeste', 'Norte'] },
            'Lima': { origin: 'Portugal', commonRegions: ['Nordeste'] },
            'Pereira': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Ferreira': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Alves': { origin: 'Portugal', commonRegions: ['Nordeste', 'Centro-Oeste'] },
            'Ribeiro': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Rodrigues': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Carvalho': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Gomes': { origin: 'Portugal', commonRegions: ['Nordeste'] },
            'Martins': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Araújo': { origin: 'Portugal', commonRegions: ['Nordeste'] },
            'Barbosa': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Nascimento': { origin: 'Brasil', commonRegions: ['Nordeste', 'Norte'] },
            'Moreira': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Nunes': { origin: 'Portugal', commonRegions: ['Sul'] },
            'Almeida': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Costa': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Vieira': { origin: 'Portugal', commonRegions: ['Sul'] },
            'Monteiro': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Mendes': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Freitas': { origin: 'Portugal', commonRegions: ['Nordeste', 'Sudeste'] },
            'Pinto': { origin: 'Portugal', commonRegions: ['Sul'] },
            'Dias': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Fernandes': { origin: 'Portugal', commonRegions: ['Sudeste', 'Sul'] },
            'Gonçalves': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Cardoso': { origin: 'Portugal', commonRegions: ['Sudeste'] },
            'Correia': { origin: 'Portugal', commonRegions: ['Nordeste'] },
            'Schmidt': { origin: 'Alemanha', commonRegions: ['Sul'] },
            'Müller': { origin: 'Alemanha', commonRegions: ['Sul'] },
            'Schneider': { origin: 'Alemanha', commonRegions: ['Sul'] },
            'Hoffmann': { origin: 'Alemanha', commonRegions: ['Sul'] },
            'Weber': { origin: 'Alemanha', commonRegions: ['Sul'] },
            'Ferrari': { origin: 'Itália', commonRegions: ['Sul', 'Sudeste'] },
            'Rossetti': { origin: 'Itália', commonRegions: ['Sul', 'Sudeste'] },
            'Romano': { origin: 'Itália', commonRegions: ['Sul', 'Sudeste'] },
            'Nakamura': { origin: 'Japão', commonRegions: ['Sudeste'] },
            'Tanaka': { origin: 'Japão', commonRegions: ['Sudeste'] },
            'Suzuki': { origin: 'Japão', commonRegions: ['Sudeste'] },
            'Kim': { origin: 'Coreia', commonRegions: ['Sudeste'] },
            'Lee': { origin: 'China', commonRegions: ['Sudeste'] },
            'Wang': { origin: 'China', commonRegions: ['Sudeste'] }
        };
        
        // Nomes comuns por década
        this.namesByDecade = {
            '1920': ['Maria', 'José', 'Antônio', 'João', 'Francisco', 'Ana', 'Manoel', 'Francisca', 'Pedro', 'Raimundo'],
            '1930': ['Maria', 'José', 'Antônio', 'João', 'Francisco', 'Ana', 'Manoel', 'Francisca', 'Pedro', 'Raimundo'],
            '1940': ['Maria', 'José', 'Antônio', 'João', 'Francisco', 'Ana', 'Manoel', 'Francisca', 'Pedro', 'Raimundo'],
            '1950': ['Maria', 'José', 'Antônio', 'João', 'Francisco', 'Ana', 'Manoel', 'Francisca', 'Pedro', 'Sebastião'],
            '1960': ['Maria', 'José', 'Antônio', 'João', 'Francisco', 'Ana', 'Paulo', 'Carlos', 'Luiz', 'Marcos'],
            '1970': ['Maria', 'José', 'Ana', 'João', 'Antônio', 'Paulo', 'Carlos', 'Márcia', 'Marcos', 'Luiz'],
            '1980': ['Ana', 'Maria', 'Marcos', 'Carlos', 'Paulo', 'Lucas', 'Patrícia', 'Juliana', 'Fernanda', 'Marcelo'],
            '1990': ['Lucas', 'Mateus', 'Felipe', 'Guilherme', 'Bruna', 'Gabriela', 'Amanda', 'Letícia', 'Jessica', 'Thiago'],
            '2000': ['Gabriel', 'Pedro', 'Mateus', 'Lucas', 'Julia', 'Maria', 'Ana', 'Beatriz', 'Laura', 'Larissa'],
            '2010': ['Miguel', 'Arthur', 'Davi', 'Gabriel', 'Helena', 'Alice', 'Laura', 'Manuela', 'Valentina', 'Sophia']
        };
        
        // Expectativa de vida média por década
        this.lifeExpectancyByDecade = {
            '1920': 35,
            '1930': 37,
            '1940': 40,
            '1950': 45,
            '1960': 52,
            '1970': 58,
            '1980': 63,
            '1990': 68,
            '2000': 71,
            '2010': 74,
            '2020': 76
        };
        
        // Idade média para ter filhos por década
        this.parentingAgeByDecade = {
            '1920': { male: 25, female: 20 },
            '1930': { male: 25, female: 20 },
            '1940': { male: 26, female: 21 },
            '1950': { male: 26, female: 22 },
            '1960': { male: 27, female: 23 },
            '1970': { male: 28, female: 24 },
            '1980': { male: 29, female: 25 },
            '1990': { male: 30, female: 26 },
            '2000': { male: 31, female: 28 },
            '2010': { male: 32, female: 30 },
            '2020': { male: 33, female: 31 }
        };
        
        // Número médio de filhos por década
        this.averageChildrenByDecade = {
            '1920': 7,
            '1930': 6,
            '1940': 6,
            '1950': 5,
            '1960': 5,
            '1970': 4,
            '1980': 3,
            '1990': 2,
            '2000': 2,
            '2010': 1.5,
            '2020': 1.5
        };
    }
    
    // Extrair sobrenome de um nome completo
    extractSurname(fullName) {
        const parts = fullName.trim().split(' ');
        if (parts.length > 1) {
            return parts[parts.length - 1];
        }
        return '';
    }
    
    // Extrair primeiro nome
    extractFirstName(fullName) {
        const parts = fullName.trim().split(' ');
        if (parts.length > 0) {
            return parts[0];
        }
        return '';
    }
    
    // Obter informações sobre um sobrenome
    getSurnameInfo(surname) {
        return this.surnameDatabase[surname] || { origin: 'Desconhecida', commonRegions: [] };
    }
    
    // Estimar década de nascimento com base na idade atual
    estimateBirthDecade(age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - age;
        const decade = Math.floor(birthYear / 10) * 10;
        return decade.toString();
    }
    
    // Gerar um nome aleatório com base na década
    generateRandomName(decade, gender) {
        const closestDecade = this.findClosestDecade(decade);
        const names = this.namesByDecade[closestDecade];
        
        // Filtrar nomes por gênero (simplificado)
        let filteredNames = names;
        if (gender === 'male') {
            filteredNames = names.filter(name => !name.endsWith('a') || name === 'Lucas');
        } else if (gender === 'female') {
            filteredNames = names.filter(name => name.endsWith('a') || name === 'Beatriz');
        }
        
        const randomIndex = Math.floor(Math.random() * filteredNames.length);
        return filteredNames[randomIndex];
    }
    
    // Encontrar a década mais próxima disponível
    findClosestDecade(decade) {
        const decades = Object.keys(this.namesByDecade).map(Number);
        let closest = decades[0];
        let minDiff = Math.abs(decade - closest);
        
        for (let i = 1; i < decades.length; i++) {
            const diff = Math.abs(decade - decades[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = decades[i];
            }
        }
        
        return closest.toString();
    }
    
    // Estimar ano de nascimento dos pais com base no ano de nascimento da pessoa
    estimateParentsBirthYear(personBirthYear, parentGender) {
        const decade = Math.floor(personBirthYear / 10) * 10;
        const closestDecade = this.findClosestDecade(decade);
        const parentingAge = this.parentingAgeByDecade[closestDecade][parentGender];
        return personBirthYear - parentingAge;
    }
    
    // Estimar ano de morte com base no ano de nascimento
    estimateDeathYear(birthYear) {
        const decade = Math.floor(birthYear / 10) * 10;
        const closestDecade = this.findClosestDecade(decade);
        const lifeExpectancy = this.lifeExpectancyByDecade[closestDecade];
        const deathYear = birthYear + lifeExpectancy;
        
        // Se a morte estimada for no futuro, retorna null (ainda vivo)
        if (deathYear > new Date().getFullYear()) {
            return null;
        }
        
        return deathYear;
    }
    
    // Gerar um número aleatório de filhos com base na década
    generateNumberOfChildren(decade) {
        const closestDecade = this.findClosestDecade(decade);
        const avgChildren = this.averageChildrenByDecade[closestDecade];
        
        // Adicionar alguma variação
        const min = Math.max(0, Math.floor(avgChildren - 2));
        const max = Math.ceil(avgChildren + 2);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Buscar dados reais de genealogia usando APIs públicas
    async searchRealGenealogyData(name, surname) {
        try {
            // Mostrar mensagem de busca
            const searchStatus = document.createElement('div');
            searchStatus.id = 'search-status';
            searchStatus.style.position = 'fixed';
            searchStatus.style.top = '50%';
            searchStatus.style.left = '50%';
            searchStatus.style.transform = 'translate(-50%, -50%)';
            searchStatus.style.padding = '20px';
            searchStatus.style.backgroundColor = 'white';
            searchStatus.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
            searchStatus.style.borderRadius = '5px';
            searchStatus.style.zIndex = '9999';
            searchStatus.innerHTML = `<p>Buscando dados reais para: ${name} ${surname}...</p><p>Por favor, aguarde.</p>`;
            document.body.appendChild(searchStatus);
            
            // Tentar primeiro com nome e sobrenome
            let searchQuery = `${name} ${surname}`;
            let response = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchQuery)}&language=pt&format=json&origin=*&limit=5`);
            let data = await response.json();
            
            // Se não encontrar resultados, tentar apenas com o sobrenome
            if (!data.search || data.search.length === 0) {
                searchStatus.innerHTML = `<p>Buscando dados para o sobrenome: ${surname}...</p><p>Por favor, aguarde.</p>`;
                searchQuery = surname;
                response = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchQuery)}&language=pt&format=json&origin=*&limit=5`);
                data = await response.json();
            }
            
            // Atualizar mensagem para mostrar progresso
            if (data.search && data.search.length > 0) {
                searchStatus.innerHTML = `<p>Encontrados ${data.search.length} resultados potenciais.</p><p>Buscando detalhes familiares...</p>`;
            }
            
            // Remover mensagem de busca
            document.body.removeChild(searchStatus);
            
            if (data.search && data.search.length > 0) {
                // Encontrou resultados
                const results = [];
                
                // Mostrar modal para selecionar a pessoa correta
                const selectedItem = await this.showPersonSelectionModal(data.search);
                if (!selectedItem) return null;
                
                // Buscar detalhes da pessoa selecionada
                const detailResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${selectedItem.id}&languages=pt&format=json&origin=*`);
                const detailData = await detailResponse.json();
                
                if (detailData.entities && detailData.entities[selectedItem.id]) {
                    const entity = detailData.entities[selectedItem.id];
                    const claims = entity.claims || {};
                    
                    // Extrair informações relevantes
                    const personInfo = {
                        id: selectedItem.id,
                        name: selectedItem.label || name,
                        description: selectedItem.description || '',
                        birthDate: this.extractDateFromClaims(claims, 'P569'), // Data de nascimento
                        deathDate: this.extractDateFromClaims(claims, 'P570'), // Data de morte
                        fatherID: this.extractRelationFromClaims(claims, 'P22'), // Pai
                        motherID: this.extractRelationFromClaims(claims, 'P25'), // Mãe
                        spouseIDs: this.extractRelationsFromClaims(claims, 'P26'), // Cônjuges
                        childrenIDs: this.extractRelationsFromClaims(claims, 'P40') // Filhos
                    };
                    
                    results.push(personInfo);
                    
                    // Mostrar mensagem de busca para os familiares
                    const familyStatus = document.createElement('div');
                    familyStatus.id = 'family-status';
                    familyStatus.style.position = 'fixed';
                    familyStatus.style.top = '50%';
                    familyStatus.style.left = '50%';
                    familyStatus.style.transform = 'translate(-50%, -50%)';
                    familyStatus.style.padding = '20px';
                    familyStatus.style.backgroundColor = 'white';
                    familyStatus.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                    familyStatus.style.borderRadius = '5px';
                    familyStatus.style.zIndex = '9999';
                    familyStatus.innerHTML = `<p>Buscando informações sobre os familiares de ${personInfo.name}...</p><p>Por favor, aguarde.</p>`;
                    document.body.appendChild(familyStatus);
                    
                    try {
                        // Buscar informações sobre os pais, se disponíveis
                        if (personInfo.fatherID) {
                            familyStatus.innerHTML = `<p>Buscando informações sobre o pai...</p>`;
                            const fatherInfo = await this.fetchEntityInfo(personInfo.fatherID);
                            if (fatherInfo) {
                                results.push(fatherInfo);
                                
                                // Buscar avôs paternos
                                if (fatherInfo.fatherID) {
                                    familyStatus.innerHTML = `<p>Buscando informações sobre o avô paterno...</p>`;
                                    const paternalGrandfatherInfo = await this.fetchEntityInfo(fatherInfo.fatherID);
                                    if (paternalGrandfatherInfo) results.push(paternalGrandfatherInfo);
                                }
                                
                                if (fatherInfo.motherID) {
                                    familyStatus.innerHTML = `<p>Buscando informações sobre a avó paterna...</p>`;
                                    const paternalGrandmotherInfo = await this.fetchEntityInfo(fatherInfo.motherID);
                                    if (paternalGrandmotherInfo) results.push(paternalGrandmotherInfo);
                                }
                            }
                        }
                        
                        if (personInfo.motherID) {
                            familyStatus.innerHTML = `<p>Buscando informações sobre a mãe...</p>`;
                            const motherInfo = await this.fetchEntityInfo(personInfo.motherID);
                            if (motherInfo) {
                                results.push(motherInfo);
                                
                                // Buscar avôs maternos
                                if (motherInfo.fatherID) {
                                    familyStatus.innerHTML = `<p>Buscando informações sobre o avô materno...</p>`;
                                    const maternalGrandfatherInfo = await this.fetchEntityInfo(motherInfo.fatherID);
                                    if (maternalGrandfatherInfo) results.push(maternalGrandfatherInfo);
                                }
                                
                                if (motherInfo.motherID) {
                                    familyStatus.innerHTML = `<p>Buscando informações sobre a avó materna...</p>`;
                                    const maternalGrandmotherInfo = await this.fetchEntityInfo(motherInfo.motherID);
                                    if (maternalGrandmotherInfo) results.push(maternalGrandmotherInfo);
                                }
                            }
                        }
                        
                        // Buscar cônjuges e filhos
                        if (personInfo.spouseIDs && personInfo.spouseIDs.length > 0) {
                            familyStatus.innerHTML = `<p>Buscando informações sobre cônjuges...</p>`;
                            for (const spouseID of personInfo.spouseIDs) {
                                const spouseInfo = await this.fetchEntityInfo(spouseID);
                                if (spouseInfo) results.push(spouseInfo);
                            }
                        }
                        
                        if (personInfo.childrenIDs && personInfo.childrenIDs.length > 0) {
                            familyStatus.innerHTML = `<p>Buscando informações sobre filhos...</p>`;
                            for (const childID of personInfo.childrenIDs) {
                                const childInfo = await this.fetchEntityInfo(childID);
                                if (childInfo) results.push(childInfo);
                            }
                        }
                    } finally {
                        // Remover mensagem de busca de familiares
                        document.body.removeChild(familyStatus);
                    }
                }
                
                return results;
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar dados reais:', error);
            // Remover mensagem de busca se ainda estiver presente
            const searchStatus = document.getElementById('search-status');
            if (searchStatus) document.body.removeChild(searchStatus);
            const familyStatus = document.getElementById('family-status');
            if (familyStatus) document.body.removeChild(familyStatus);
            return null;
        }
    }
    
    // Mostrar modal para selecionar a pessoa correta entre os resultados
    async showPersonSelectionModal(searchResults) {
        return new Promise((resolve) => {
            const selectPersonModal = document.createElement('div');
            selectPersonModal.className = 'modal';
            selectPersonModal.style.display = 'block';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const closeSpan = document.createElement('span');
            closeSpan.className = 'close';
            closeSpan.innerHTML = '&times;';
            closeSpan.onclick = function() {
                document.body.removeChild(selectPersonModal);
                resolve(null);
            };
            
            const modalTitle = document.createElement('h2');
            modalTitle.textContent = 'Selecione a pessoa correta';
            
            const modalBody = document.createElement('div');
            modalBody.innerHTML = '<p>Encontramos várias pessoas com esse nome. Selecione a pessoa correta:</p>';
            
            const personList = document.createElement('div');
            personList.style.maxHeight = '300px';
            personList.style.overflowY = 'auto';
            personList.style.margin = '15px 0';
            
            searchResults.forEach(result => {
                const personItem = document.createElement('div');
                personItem.className = 'person-item';
                personItem.style.padding = '10px';
                personItem.style.margin = '5px 0';
                personItem.style.border = '1px solid #ddd';
                personItem.style.borderRadius = '4px';
                personItem.style.cursor = 'pointer';
                
                personItem.innerHTML = `
                    <strong>${result.label || 'Sem nome'}</strong>
                    ${result.description ? `<p>${result.description}</p>` : ''}
                    <small>ID: ${result.id}</small>
                `;
                
                personItem.addEventListener('mouseover', function() {
                    this.style.backgroundColor = '#f5f5f5';
                });
                
                personItem.addEventListener('mouseout', function() {
                    this.style.backgroundColor = 'white';
                });
                
                personItem.addEventListener('click', function() {
                    document.body.removeChild(selectPersonModal);
                    resolve(result);
                });
                
                personList.appendChild(personItem);
            });
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-secondary';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.onclick = function() {
                document.body.removeChild(selectPersonModal);
                resolve(null);
            };
            
            modalBody.appendChild(personList);
            modalBody.appendChild(cancelBtn);
            
            modalContent.appendChild(closeSpan);
            modalContent.appendChild(modalTitle);
            modalContent.appendChild(modalBody);
            
            selectPersonModal.appendChild(modalContent);
            document.body.appendChild(selectPersonModal);
        });
    }
    
    // Extrair data de nascimento/morte dos dados do WikiData
    extractDateFromClaims(claims, property) {
        if (claims[property] && claims[property][0] && claims[property][0].mainsnak && 
            claims[property][0].mainsnak.datavalue && claims[property][0].mainsnak.datavalue.value) {
            
            const value = claims[property][0].mainsnak.datavalue.value;
            if (value.time) {
                // Formato: +1956-01-01T00:00:00Z
                return value.time.replace(/^\+/, '').split('T')[0];
            }
        }
        return null;
    }
    
    // Extrair ID de relação (pai, mãe) dos dados do WikiData
    extractRelationFromClaims(claims, property) {
        if (claims[property] && claims[property][0] && claims[property][0].mainsnak && 
            claims[property][0].mainsnak.datavalue && claims[property][0].mainsnak.datavalue.value) {
            
            return claims[property][0].mainsnak.datavalue.value.id;
        }
        return null;
    }
    
    // Extrair múltiplas relações (cônjuges, filhos) dos dados do WikiData
    extractRelationsFromClaims(claims, property) {
        const relations = [];
        
        if (claims[property]) {
            for (const claim of claims[property]) {
                if (claim.mainsnak && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value) {
                    relations.push(claim.mainsnak.datavalue.value.id);
                }
            }
        }
        
        return relations;
    }
    
    // Buscar informações de uma entidade específica no WikiData
    async fetchEntityInfo(entityID) {
        try {
            const response = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityID}&languages=pt&format=json&origin=*`);
            const data = await response.json();
            
            if (data.entities && data.entities[entityID]) {
                const entity = data.entities[entityID];
                const claims = entity.claims || {};
                
                return {
                    id: entityID,
                    name: entity.labels && entity.labels.pt ? entity.labels.pt.value : 'Desconhecido',
                    description: entity.descriptions && entity.descriptions.pt ? entity.descriptions.pt.value : '',
                    birthDate: this.extractDateFromClaims(claims, 'P569'),
                    deathDate: this.extractDateFromClaims(claims, 'P570'),
                    fatherID: this.extractRelationFromClaims(claims, 'P22'),
                    motherID: this.extractRelationFromClaims(claims, 'P25'),
                    spouseIDs: this.extractRelationsFromClaims(claims, 'P26'),
                    childrenIDs: this.extractRelationsFromClaims(claims, 'P40')
                };
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar entidade:', error);
            return null;
        }
    }
    
    // Converter dados do WikiData para o formato da nossa árvore
    convertWikiDataToFamilyTree(familyTree, wikiDataResults, rootPersonId) {
        if (!wikiDataResults || wikiDataResults.length === 0) return false;
        
        console.log('Dados encontrados no WikiData:', wikiDataResults);
        
        // Mapear IDs do WikiData para IDs da nossa árvore
        const idMapping = {};
        
        // Verificar se já temos a pessoa raiz na árvore
        let rootPerson = null;
        if (rootPersonId) {
            rootPerson = familyTree.getPersonById(rootPersonId);
        }
        
        // Primeiro, criar todas as pessoas ou mapeá-las se já existirem
        for (const personData of wikiDataResults) {
            // Se for a pessoa raiz, usar a existente
            if (rootPerson && personData === wikiDataResults[0]) {
                idMapping[personData.id] = rootPersonId;
                continue;
            }
            
            const gender = this.inferGenderFromWikiData(personData);
            
            const person = new Person(
                personData.name,
                gender,
                personData.birthDate,
                personData.deathDate
            );
            
            familyTree.addPerson(person);
            idMapping[personData.id] = person.id;
            
            // Se for a primeira pessoa e não temos um ID raiz, usar esta pessoa como raiz
            if (!rootPersonId && personData === wikiDataResults[0]) {
                rootPersonId = person.id;
            }
        }
        
        console.log('Mapeamento de IDs:', idMapping);
        
        // Depois, criar todos os relacionamentos
        for (const personData of wikiDataResults) {
            const personId = idMapping[personData.id];
            if (!personId) continue; // Pular se não temos o ID mapeado
            
            // Adicionar relação com o pai
            if (personData.fatherID && idMapping[personData.fatherID]) {
                const fatherId = idMapping[personData.fatherID];
                
                // Verificar se o relacionamento já existe
                const existingRelationship = familyTree.relationships.some(rel => 
                    rel.type === 'parent-child' && rel.parentId === fatherId && rel.childId === personId
                );
                
                if (!existingRelationship) {
                    const relationship = new Relationship('parent-child', fatherId, null, personId);
                    familyTree.addRelationship(relationship);
                    console.log(`Adicionada relação pai-filho: ${fatherId} -> ${personId}`);
                }
            }
            
            // Adicionar relação com a mãe
            if (personData.motherID && idMapping[personData.motherID]) {
                const motherId = idMapping[personData.motherID];
                
                // Verificar se o relacionamento já existe
                const existingRelationship = familyTree.relationships.some(rel => 
                    rel.type === 'parent-child' && rel.parentId === motherId && rel.childId === personId
                );
                
                if (!existingRelationship) {
                    const relationship = new Relationship('parent-child', motherId, null, personId);
                    familyTree.addRelationship(relationship);
                    console.log(`Adicionada relação mãe-filho: ${motherId} -> ${personId}`);
                }
            }
            
            // Adicionar relações com cônjuges
            if (personData.spouseIDs && personData.spouseIDs.length > 0) {
                for (const spouseID of personData.spouseIDs) {
                    if (idMapping[spouseID]) {
                        const spouseId = idMapping[spouseID];
                        
                        // Verificar se o relacionamento já existe
                        const existingRelationship = familyTree.relationships.some(rel => 
                            rel.type === 'spouse' && 
                            ((rel.person1Id === personId && rel.person2Id === spouseId) ||
                             (rel.person1Id === spouseId && rel.person2Id === personId))
                        );
                        
                        if (!existingRelationship) {
                            const relationship = new Relationship('spouse', personId, spouseId);
                            familyTree.addRelationship(relationship);
                            console.log(`Adicionada relação cônjuge: ${personId} <-> ${spouseId}`);
                        }
                    }
                }
            }
            
            // Adicionar relações com filhos
            if (personData.childrenIDs && personData.childrenIDs.length > 0) {
                for (const childID of personData.childrenIDs) {
                    if (idMapping[childID]) {
                        const childId = idMapping[childID];
                        
                        // Verificar se o relacionamento já existe
                        const existingRelationship = familyTree.relationships.some(rel => 
                            rel.type === 'parent-child' && rel.parentId === personId && rel.childId === childId
                        );
                        
                        if (!existingRelationship) {
                            const relationship = new Relationship('parent-child', personId, null, childId);
                            familyTree.addRelationship(relationship);
                            console.log(`Adicionada relação pai/mãe-filho: ${personId} -> ${childId}`);
                        }
                    }
                }
            }
        }
        
        console.log('Relacionamentos após conversão:', familyTree.relationships);
        return true;
    }
    
    // Inferir gênero a partir dos dados do WikiData
    inferGenderFromWikiData(personData) {
        // Lógica simplificada: verificar se é pai ou mãe de alguém
        if (personData.fatherID) return 'male';
        if (personData.motherID) return 'female';
        
        // Verificar pelo nome (heurística simples para português)
        const firstName = this.extractFirstName(personData.name);
        if (firstName.endsWith('a') && !firstName.endsWith('ca') && !firstName.endsWith('ra')) {
            return 'female';
        } else {
            return 'male';
        }
    }
    
    // Autocompletar a árvore com base em uma pessoa e seus pais
    async autoCompleteTree(familyTree, personId) {
        const person = familyTree.getPersonById(personId);
        if (!person) return;
        
        // Se estiver configurado para usar dados reais
        if (this.useRealData) {
            const personName = person.name;
            const firstName = this.extractFirstName(personName);
            const surname = this.extractSurname(personName);
            
            // Buscar dados reais
            const realData = await this.searchRealGenealogyData(firstName, surname);
            
            if (realData && realData.length > 0) {
                // Converter dados reais para nossa árvore
                const success = this.convertWikiDataToFamilyTree(familyTree, realData, personId);
                
                if (success) {
                    return familyTree;
                }
            }
            
            // Se não encontrou dados reais, perguntar se deseja usar dados gerados
            if (confirm('Não foram encontrados dados reais para esta pessoa. Deseja gerar dados fictícios para completar a árvore?')) {
                // Continuar com a geração de dados fictícios
            } else {
                return familyTree; // Retornar sem modificações
            }
        }
        
        // Se não encontrou dados reais ou está configurado para usar dados gerados
        
        const personName = person.name;
        const personSurname = this.extractSurname(personName);
        const personBirthDate = person.birthDate ? new Date(person.birthDate) : null;
        const personBirthYear = personBirthDate ? personBirthDate.getFullYear() : new Date().getFullYear() - 30;
        
        // Obter os pais existentes
        const existingParents = familyTree.getParents(personId);
        
        // Se não tiver pais ou tiver apenas um, gerar os pais faltantes
        if (existingParents.length < 2) {
            this.generateParents(familyTree, person, existingParents, personBirthYear, personSurname);
        }
        
        // Agora que temos os pais, vamos gerar os avós
        const parents = familyTree.getParents(personId);
        parents.forEach(parent => {
            const parentBirthDate = parent.birthDate ? new Date(parent.birthDate) : null;
            const parentBirthYear = parentBirthDate ? parentBirthDate.getFullYear() : 
                this.estimateParentsBirthYear(personBirthYear, parent.gender);
            const parentSurname = this.extractSurname(parent.name);
            
            // Gerar os pais do pai (avós da pessoa)
            const existingGrandparents = familyTree.getParents(parent.id);
            if (existingGrandparents.length < 2) {
                this.generateParents(familyTree, parent, existingGrandparents, parentBirthYear, parentSurname);
            }
        });
        
        // Gerar irmãos se não houver
        const siblings = familyTree.getSiblings(personId);
        if (siblings.length === 0) {
            // Determinar quantos irmãos gerar
            const decade = Math.floor(personBirthYear / 10) * 10;
            const numSiblings = this.generateNumberOfChildren(decade) - 1; // -1 porque já temos a pessoa
            
            if (numSiblings > 0) {
                const parents = familyTree.getParents(personId);
                if (parents.length > 0) {
                    // Usar o pai como referência para criar irmãos
                    const father = parents.find(p => p.gender === 'male') || parents[0];
                    const mother = parents.find(p => p.gender === 'female') || null;
                    
                    for (let i = 0; i < numSiblings; i++) {
                        // Determinar o ano de nascimento do irmão (entre -5 e +5 anos de diferença)
                        const ageDiff = Math.floor(Math.random() * 11) - 5;
                        const siblingBirthYear = personBirthYear + ageDiff;
                        
                        // Gerar nome e gênero aleatórios
                        const gender = Math.random() > 0.5 ? 'male' : 'female';
                        let firstName = this.generateRandomName(siblingBirthYear, gender);
                        
                        // Construir o nome completo
                        let fullName = '';
                        if (mother) {
                            const motherSurname = this.extractSurname(mother.name);
                            fullName = `${firstName} ${motherSurname} ${personSurname}`;
                        } else {
                            fullName = `${firstName} ${personSurname}`;
                        }
                        
                        // Criar o irmão
                        const birthDate = new Date(siblingBirthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                        const sibling = new Person(fullName, gender, birthDate.toISOString().split('T')[0]);
                        
                        // Adicionar à árvore
                        familyTree.addPerson(sibling);
                        
                        // Criar relacionamento com os pais
                        if (father) {
                            const relationship = new Relationship('parent-child', father.id, null, sibling.id);
                            familyTree.addRelationship(relationship);
                        }
                        
                        if (mother) {
                            const relationship = new Relationship('parent-child', mother.id, null, sibling.id);
                            familyTree.addRelationship(relationship);
                        }
                    }
                }
            }
        }
        
        return familyTree;
    }
    
    // Gerar pais para uma pessoa
    generateParents(familyTree, person, existingParents, personBirthYear, personSurname) {
        // Verificar se já temos pai e mãe
        const hasFather = existingParents.some(p => p.gender === 'male');
        const hasMother = existingParents.some(p => p.gender === 'female');
        
        // Gerar o pai se não existir
        if (!hasFather) {
            const fatherBirthYear = this.estimateParentsBirthYear(personBirthYear, 'male');
            const fatherFirstName = this.generateRandomName(fatherBirthYear, 'male');
            
            // Determinar o sobrenome do pai (que será passado para a pessoa)
            let fatherSurname = personSurname;
            if (!fatherSurname) {
                // Se a pessoa não tem sobrenome, gerar um aleatório
                const surnames = Object.keys(this.surnameDatabase);
                fatherSurname = surnames[Math.floor(Math.random() * surnames.length)];
            }
            
            const fatherName = `${fatherFirstName} ${fatherSurname}`;
            const fatherBirthDate = new Date(fatherBirthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            const fatherDeathYear = this.estimateDeathYear(fatherBirthYear);
            let fatherDeathDate = null;
            
            if (fatherDeathYear) {
                fatherDeathDate = new Date(fatherDeathYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            }
            
            const father = new Person(
                fatherName, 
                'male', 
                fatherBirthDate.toISOString().split('T')[0], 
                fatherDeathDate ? fatherDeathDate.toISOString().split('T')[0] : null
            );
            
            familyTree.addPerson(father);
            
            // Criar relacionamento pai-filho
            const relationship = new Relationship('parent-child', father.id, null, person.id);
            familyTree.addRelationship(relationship);
        }
        
        // Gerar a mãe se não existir
        if (!hasMother) {
            const motherBirthYear = this.estimateParentsBirthYear(personBirthYear, 'female');
            const motherFirstName = this.generateRandomName(motherBirthYear, 'female');
            
            // Determinar o sobrenome da mãe (geralmente diferente do pai)
            let motherSurname = '';
            if (existingParents.length > 0 && existingParents[0].gender === 'male') {
                // Se já temos o pai, usar um sobrenome diferente
                const fatherSurname = this.extractSurname(existingParents[0].name);
                const surnames = Object.keys(this.surnameDatabase).filter(s => s !== fatherSurname);
                motherSurname = surnames[Math.floor(Math.random() * surnames.length)];
            } else {
                // Se não temos o pai ou a mãe é o primeiro pai, gerar um sobrenome aleatório
                const surnames = Object.keys(this.surnameDatabase);
                motherSurname = surnames[Math.floor(Math.random() * surnames.length)];
            }
            
            const motherName = `${motherFirstName} ${motherSurname}`;
            const motherBirthDate = new Date(motherBirthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            const motherDeathYear = this.estimateDeathYear(motherBirthYear);
            let motherDeathDate = null;
            
            if (motherDeathYear) {
                motherDeathDate = new Date(motherDeathYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            }
            
            const mother = new Person(
                motherName, 
                'female', 
                motherBirthDate.toISOString().split('T')[0], 
                motherDeathDate ? motherDeathDate.toISOString().split('T')[0] : null
            );
            
            familyTree.addPerson(mother);
            
            // Criar relacionamento mãe-filho
            const relationship = new Relationship('parent-child', mother.id, null, person.id);
            familyTree.addRelationship(relationship);
            
            // Se já temos o pai, criar relacionamento de cônjuge
            const father = existingParents.find(p => p.gender === 'male');
            if (father) {
                const spouseRelationship = new Relationship('spouse', father.id, mother.id);
                familyTree.addRelationship(spouseRelationship);
            }
        }
    }
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    // Criar a árvore genealógica
    const familyTree = new FamilyTree();
    
    // Referências aos elementos do DOM
    const personForm = document.getElementById('personForm');
    const nameInput = document.getElementById('name');
    const genderSelect = document.getElementById('gender');
    const birthDateInput = document.getElementById('birthDate');
    const deathDateInput = document.getElementById('deathDate');
    const relationSelect = document.getElementById('relation');
    const relatedToSelect = document.getElementById('relatedTo');
    const relatedToGroup = document.getElementById('relatedToGroup');
    
    const dataSourceToggle = document.getElementById('dataSourceToggle');
    const toggleLabel = document.querySelector('.toggle-label');
    const autoCompleteBtn = document.getElementById('autoCompleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const loadBody = document.getElementById('load-body');
    const saveCode = document.getElementById('save-code');
    const loadCode = document.getElementById('load-code');
    const copyBtn = document.getElementById('copy-btn');
    const loadTreeBtn = document.getElementById('load-tree-btn');
    const closeBtn = document.querySelector('.close');
    
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const resetZoomBtn = document.getElementById('resetZoom');
    
    // Variáveis para o D3.js
    let svg = null;
    let g = null;
    let zoom = null;
    let currentScale = 1;
    
    // Configurações do D3.js
    const width = 1000;
    const height = 600;
    const nodeWidth = 120;
    const nodeHeight = 60;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // Inicializar a visualização
    initializeVisualization();
    
    // Carregar dados salvos do localStorage, se existirem
    loadFromLocalStorage();
    
    // Atualizar a lista de pessoas relacionadas
    updateRelatedToSelect();
    
    // Mostrar/ocultar o campo "Relacionado a" com base na relação selecionada
    relationSelect.addEventListener('change', function() {
        const relation = this.value;
        if (relation === 'root') {
            relatedToGroup.style.display = 'none';
        } else {
            relatedToGroup.style.display = 'block';
            updateRelatedToSelect();
        }
    });
    
    // Adicionar uma nova pessoa à árvore
    personForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const gender = genderSelect.value;
        const birthDate = birthDateInput.value || null;
        const deathDate = deathDateInput.value || null;
        const relation = relationSelect.value;
        const relatedTo = relatedToSelect.value;
        
        if (!name) {
            alert('Por favor, insira um nome.');
            return;
        }
        
        // Criar a nova pessoa
        const newPerson = new Person(name, gender, birthDate, deathDate);
        familyTree.addPerson(newPerson);
        
        // Adicionar relacionamento, se necessário
        if (relation !== 'root' && relatedTo) {
            if (relation === 'parent') {
                // A nova pessoa é pai/mãe da pessoa selecionada
                const relationship = new Relationship('parent-child', newPerson.id, null, relatedTo);
                familyTree.addRelationship(relationship);
            } else if (relation === 'child') {
                // A nova pessoa é filho(a) da pessoa selecionada
                const relationship = new Relationship('parent-child', relatedTo, null, newPerson.id);
                familyTree.addRelationship(relationship);
            } else if (relation === 'spouse') {
                // A nova pessoa é cônjuge da pessoa selecionada
                const relationship = new Relationship('spouse', newPerson.id, relatedTo);
                familyTree.addRelationship(relationship);
            } else if (relation === 'sibling') {
                // A nova pessoa é irmão/irmã da pessoa selecionada
                const relationship = new Relationship('sibling', newPerson.id, relatedTo);
                familyTree.addRelationship(relationship);
                
                // Adicionar também relacionamentos parent-child com os mesmos pais
                const parents = familyTree.getParents(relatedTo);
                parents.forEach(parent => {
                    const parentRelationship = new Relationship('parent-child', parent.id, null, newPerson.id);
                    familyTree.addRelationship(parentRelationship);
                });
            }
        }
        
        // Limpar o formulário
        personForm.reset();
        relationSelect.value = 'root';
        relatedToGroup.style.display = 'none';
        
        // Atualizar a visualização e salvar no localStorage
        updateVisualization();
        saveToLocalStorage();
        updateRelatedToSelect();
    });
    
    // Salvar a árvore
    saveBtn.addEventListener('click', function() {
        modalTitle.textContent = 'Salvar Árvore';
        modalBody.style.display = 'block';
        loadBody.style.display = 'none';
        saveCode.value = familyTree.toJSON();
        modal.style.display = 'block';
    });
    
    // Copiar o código de salvamento
    copyBtn.addEventListener('click', function() {
        saveCode.select();
        document.execCommand('copy');
        alert('Código copiado para a área de transferência!');
    });
    
    // Carregar a árvore
    loadBtn.addEventListener('click', function() {
        modalTitle.textContent = 'Carregar Árvore';
        modalBody.style.display = 'none';
        loadBody.style.display = 'block';
        loadCode.value = '';
        modal.style.display = 'block';
    });
    
    // Carregar a árvore a partir do código
    loadTreeBtn.addEventListener('click', function() {
        const code = loadCode.value.trim();
        if (!code) {
            alert('Por favor, insira o código da árvore.');
            return;
        }
        
        if (familyTree.fromJSON(code)) {
            updateVisualization();
            saveToLocalStorage();
            updateRelatedToSelect();
            modal.style.display = 'none';
            alert('Árvore carregada com sucesso!');
        } else {
            alert('Erro ao carregar a árvore. Verifique o código e tente novamente.');
        }
    });
    
    // Fechar o modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Fechar o modal ao clicar fora dele
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Exportar como PNG
    exportPngBtn.addEventListener('click', function() {
        const treeView = document.getElementById('tree-view');
        
        html2canvas(treeView).then(canvas => {
            const link = document.createElement('a');
            link.download = 'arvore-genealogica.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
    
    // Limpar a árvore
    clearBtn.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja limpar toda a árvore? Esta ação não pode ser desfeita.')) {
            familyTree.clear();
            updateVisualization();
            saveToLocalStorage();
            updateRelatedToSelect();
        }
    });
    
    // Toggle para fonte de dados
    dataSourceToggle.addEventListener('change', function() {
        familyTree.autoCompleteAPI.useRealData = this.checked;
        toggleLabel.textContent = this.checked ? 'Dados Reais' : 'Dados Fictícios';
    });
    
    // Autocompletar a árvore
    autoCompleteBtn.addEventListener('click', async function() {
        // Verificar se há pelo menos uma pessoa na árvore
        if (familyTree.people.length === 0) {
            alert('Adicione pelo menos uma pessoa à árvore antes de usar o autocompletar.');
            return;
        }
        
        // Perguntar ao usuário qual pessoa usar como base para autocompletar
        const selectPersonModal = document.createElement('div');
        selectPersonModal.className = 'modal';
        selectPersonModal.style.display = 'block';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const closeSpan = document.createElement('span');
        closeSpan.className = 'close';
        closeSpan.innerHTML = '&times;';
        closeSpan.onclick = function() {
            document.body.removeChild(selectPersonModal);
        };
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = 'Selecione a pessoa para autocompletar';
        
        const modalBody = document.createElement('div');
        modalBody.innerHTML = `<p>Escolha a pessoa que será usada como base para autocompletar a árvore ${familyTree.autoCompleteAPI.useRealData ? 'com dados reais' : 'com dados fictícios'}:</p>`;
        
        const personSelect = document.createElement('select');
        personSelect.style.width = '100%';
        personSelect.style.padding = '10px';
        personSelect.style.marginBottom = '20px';
        
        familyTree.people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            personSelect.appendChild(option);
        });
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-primary';
        confirmBtn.textContent = 'Autocompletar';
        confirmBtn.onclick = async function() {
            const selectedPersonId = personSelect.value;
            
            // Desabilitar o botão durante o processamento
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processando...';
            
            try {
                // Executar o autocompletar (agora assíncrono)
                await familyTree.autoCompleteAPI.autoCompleteTree(familyTree, selectedPersonId);
                
                // Atualizar a visualização e salvar
                // Forçar uma recriação completa da visualização
                g.selectAll('*').remove();
                updateVisualization();
                saveToLocalStorage();
                updateRelatedToSelect();
                
                // Centralizar a visualização
                const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2);
                svg.call(zoom.transform, initialTransform);
                
                // Fechar o modal
                document.body.removeChild(selectPersonModal);
                
                if (familyTree.autoCompleteAPI.useRealData) {
                    alert('Autocompletar concluído! A árvore foi expandida com dados reais (quando disponíveis) e dados complementares gerados automaticamente.');
                } else {
                    alert('Autocompletar concluído! A árvore foi expandida com informações geradas automaticamente.');
                }
            } catch (error) {
                console.error('Erro ao autocompletar:', error);
                alert('Ocorreu um erro ao autocompletar a árvore. Por favor, tente novamente.');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Autocompletar';
            }
        };
        
        modalBody.appendChild(personSelect);
        modalBody.appendChild(confirmBtn);
        
        modalContent.appendChild(closeSpan);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalBody);
        
        selectPersonModal.appendChild(modalContent);
        document.body.appendChild(selectPersonModal);
    });
    
    // Zoom in
    zoomInBtn.addEventListener('click', function() {
        zoom.scaleBy(svg.transition().duration(300), 1.2);
    });
    
    // Zoom out
    zoomOutBtn.addEventListener('click', function() {
        zoom.scaleBy(svg.transition().duration(300), 0.8);
    });
    
    // Reset zoom
    resetZoomBtn.addEventListener('click', function() {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    });
    
    // Inicializar a visualização D3.js
    function initializeVisualization() {
        // Criar o SVG
        svg = d3.select('#tree-view')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        // Adicionar um grupo para conter a árvore
        g = svg.append('g');
        
        // Adicionar zoom
        zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                currentScale = event.transform.k;
            });
        
        svg.call(zoom);
        
        // Centralizar inicialmente
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2);
        svg.call(zoom.transform, initialTransform);
    }
    
    // Atualizar a visualização da árvore
    function updateVisualization() {
        // Limpar a visualização atual
        g.selectAll('*').remove();
        
        // Obter os dados no formato D3.js
        const treeData = familyTree.toD3Format();
        
        if (!treeData) {
            return;
        }
        
        // Criar o layout da árvore
        const treeLayout = d3.tree()
            .nodeSize([nodeWidth * 1.5, nodeHeight * 2]);
        
        // Aplicar o layout aos dados
        const root = d3.hierarchy(treeData);
        treeLayout(root);
        
        // Desenhar as linhas entre os nós
        const links = g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d => {
                return `M${d.source.x},${d.source.y}
                        C${d.source.x},${(d.source.y + d.target.y) / 2}
                        ${d.target.x},${(d.source.y + d.target.y) / 2}
                        ${d.target.x},${d.target.y}`;
            });
        
        // Criar os nós
        const nodes = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', d => `node ${d.data.gender}`)
            .attr('transform', d => `translate(${d.x},${d.y})`);
        
        // Adicionar retângulos aos nós
        nodes.append('rect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('x', -nodeWidth / 2)
            .attr('y', -nodeHeight / 2);
        
        // Adicionar o nome da pessoa
        nodes.append('text')
            .attr('dy', '-0.5em')
            .text(d => d.data.name);
        
        // Adicionar datas, se disponíveis
        nodes.append('text')
            .attr('dy', '1em')
            .attr('class', 'dates')
            .text(d => {
                let dateText = '';
                
                if (d.data.birthDate) {
                    const birthYear = new Date(d.data.birthDate).getFullYear();
                    dateText += birthYear;
                }
                
                if (d.data.deathDate) {
                    const deathYear = new Date(d.data.deathDate).getFullYear();
                    dateText += ` - ${deathYear}`;
                }
                
                return dateText;
            });
        
        // Adicionar evento de clique para centralizar no nó
        nodes.on('click', function(event, d) {
            const transform = d3.zoomIdentity
                .translate(width / 2 - d.x * currentScale, height / 2 - d.y * currentScale)
                .scale(currentScale);
            
            svg.transition().duration(500).call(zoom.transform, transform);
        });
    }
    
    // Atualizar a lista de pessoas relacionadas
    function updateRelatedToSelect() {
        // Limpar as opções atuais
        relatedToSelect.innerHTML = '<option value="">Selecione uma pessoa</option>';
        
        // Adicionar todas as pessoas como opções
        familyTree.getAllPeople().forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.name;
            relatedToSelect.appendChild(option);
        });
    }
    
    // Salvar no localStorage
    function saveToLocalStorage() {
        localStorage.setItem('familyTree', familyTree.toJSON());
    }
    
    // Carregar do localStorage
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('familyTree');
        
        if (savedData) {
            if (familyTree.fromJSON(savedData)) {
                updateVisualization();
                updateRelatedToSelect();
            }
        }
    }
});
